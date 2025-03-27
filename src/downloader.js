import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';
import sanitize from 'sanitize-filename';
import AdmZip from 'adm-zip';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';

export async function downloadWebpage(url) {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'webpage-'));
  const assetsDir = path.join(tempDir, 'assets');
  const zip = new AdmZip();

  try {
    // Create directories
    await fs.mkdir(assetsDir, { recursive: true });

    // Fetch webpage content
    console.log('Fetching webpage:', url);
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;

    // Parse HTML
    const $ = cheerio.load(html);
    const assets = new Set();
    let downloadedAssets = 0;

    // Process different asset types
    const assetTypes = {
      'img[src]': 'src',
      'link[rel="stylesheet"]': 'href',
      'script[src]': 'src',
      'video[src]': 'src',
      'source[src]': 'src',
      'audio[src]': 'src',
      'link[rel="icon"]': 'href',
      'link[rel="shortcut icon"]': 'href'
    };

    // Remove srcset attribute from all images to ensure offline availability
    $('img').removeAttr('srcset');

    // Download assets
    for (const [selector, attr] of Object.entries(assetTypes)) {
      $(selector).each((_, element) => {
        const assetUrl = $(element).attr(attr);
        if (assetUrl && !assetUrl.startsWith('data:') && !assetUrl.startsWith('blob:')) {
          try {
            const fullUrl = new URL(assetUrl, url).toString();
            assets.add(fullUrl);
          } catch (error) {
            console.warn(`Invalid URL: ${assetUrl}`, error.message);
          }
        }
      });
    }

    // Download and save assets
    for (const assetUrl of assets) {
      try {
        const response = await axios.get(assetUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
          maxContentLength: 50 * 1024 * 1024, // 50MB max
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        const extension = mime.extension(response.headers['content-type']) || 'txt';
        const filename = `asset-${downloadedAssets}.${extension}`;
        const assetPath = path.join(assetsDir, filename);

        await fs.writeFile(assetPath, response.data);

        // Update HTML to use local path
        $(`[src="${assetUrl}"]`).attr('src', `assets/${filename}`);
        $(`[href="${assetUrl}"]`).attr('href', `assets/${filename}`);

        downloadedAssets++;
      } catch (error) {
        console.warn(`Failed to download asset: ${assetUrl}`, error.message);
      }
    }

    // Save modified HTML
    const modifiedHtml = $.html();
    await fs.writeFile(path.join(tempDir, 'index.html'), modifiedHtml);

    // Create ZIP file
    zip.addLocalFolder(tempDir);
    const zipBuffer = zip.toBuffer();

    // Clean up temp directory
    // await fs.rm(tempDir, { recursive: true, force: true });

    const sanitizedUrl = sanitize(new URL(url).hostname);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sanitizedUrl}-${timestamp}.zip`;

    return {
      zipBuffer,
      filename,
      assetsCount: downloadedAssets
    };
  } catch (error) {
    // Clean up temp directory in case of error
    await fs.rm(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to download webpage: ${error.message}`);
  }
}