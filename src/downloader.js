import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';
import sanitize from 'sanitize-filename';
import AdmZip from 'adm-zip';
import { mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { URL } from 'url';
import pQueue from 'p-queue';

// Configuration options
const CONFIG = {
  maxDepth: 2,                   // How many levels of links to follow
  maxPagesPerDomain: 50,         // Maximum pages to download per domain
  maxTotalPages: 200,            // Maximum total pages to download
  maxConcurrent: 5,              // Maximum concurrent downloads
  excludeExtensions: ['.pdf', '.zip', '.rar', '.exe', '.dmg', '.iso', '.mp4', '.mp3', '.avi'],
  timeout: 30000,                // 30 seconds timeout
  maxAssetSize: 50 * 1024 * 1024, // 50MB max for assets
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

export async function downloadWebsite(startUrl, options = {}) {
  // Merge default config with provided options
  const config = { ...CONFIG, ...options };

  // Create temporary directory
  const tempDir = await mkdtemp(path.join(tmpdir(), 'website-'));
  const pagesDir = path.join(tempDir, 'pages');
  const zip = new AdmZip();

  // Initialize tracking variables
  const processedUrls = new Set();
  const pendingUrls = new Map(); // url -> { depth, localPath }
  const domainCounters = new Map();
  const queue = new pQueue({ concurrency: config.maxConcurrent });

  let totalPages = 0;
  let failedPages = 0;
  let totalAssets = 0;

  try {
    // Create directory structure
    await fs.mkdir(pagesDir, { recursive: true });

    // Parse starting URL
    const startUrlObj = new URL(startUrl);
    const baseDomain = startUrlObj.hostname;

    // Add starting URL to queue
    const startUrlLocal = 'index.html';
    pendingUrls.set(startUrl, { depth: 0, localPath: startUrlLocal });

    // Process queue
    while (pendingUrls.size > 0 && totalPages < config.maxTotalPages) {
      const batchPromises = [];

      // Get batch of URLs to process
      for (const [url, { depth, localPath }] of pendingUrls.entries()) {
        // Remove from pending
        pendingUrls.delete(url);

        // Skip if already processed
        if (processedUrls.has(url)) continue;

        // Add to processed
        processedUrls.add(url);

        // Process URL
        batchPromises.push(queue.add(() => processUrl(url, depth, localPath)));

        // Check domain and total limits
        if (totalPages >= config.maxTotalPages) break;
      }

      // Wait for batch to complete
      await Promise.all(batchPromises);
    }

    // Create ZIP file
    zip.addLocalFolder(tempDir);
    const zipBuffer = zip.toBuffer();

    // Generate filename
    const sanitizedDomain = sanitize(baseDomain);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sanitizedDomain}-archive-${timestamp}.zip`;

    // Clean up temp directory
    // await fs.rm(tempDir, { recursive: true, force: true });

    return {
      zipBuffer,
      filename,
      stats: {
        totalPages,
        failedPages,
        totalAssets,
        processedUrls: Array.from(processedUrls)
      }
    };
  } catch (error) {
    // Clean up temp directory in case of error
    await fs.rm(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to download website: ${error.message}`);
  }

  // Helper function to process a URL
  async function processUrl(url, depth, localPath) {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Check domain counter
    if (!domainCounters.has(domain)) {
      domainCounters.set(domain, 0);
    }

    const domainCount = domainCounters.get(domain);
    if (domainCount >= config.maxPagesPerDomain) {
      return;
    }

    // Update domain counter
    domainCounters.set(domain, domainCount + 1);
    totalPages++;

    console.log(`[${totalPages}] Processing: ${url} (depth ${depth})`);

    try {
      // Create page directory
      const pageDir = path.dirname(path.join(pagesDir, localPath));
      await fs.mkdir(pageDir, { recursive: true });

      // Fetch webpage content
      const response = await axios.get(url, {
        timeout: config.timeout,
        headers: {
          'User-Agent': config.userAgent
        }
      });

      // Skip non-HTML content
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        console.log(`Skipping non-HTML content: ${url} (${contentType})`);
        return;
      }

      const html = response.data;

      // Parse HTML
      const $ = cheerio.load(html);
      const assets = new Set();

      // Process page assets
      const assetsDir = path.join(pageDir, 'assets');
      await fs.mkdir(assetsDir, { recursive: true });

      // Remove srcset attribute from all images
      $('img').removeAttr('srcset');

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

      // Collect assets
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

      // Download assets
      for (const assetUrl of assets) {
        try {
          const response = await axios.get(assetUrl, {
            responseType: 'arraybuffer',
            timeout: config.timeout,
            maxContentLength: config.maxAssetSize,
            headers: {
              'User-Agent': config.userAgent
            }
          });

          const extension = mime.extension(response.headers['content-type']) || 'txt';
          const assetFilename = `asset-${totalAssets}.${extension}`;
          const assetPath = path.join(assetsDir, assetFilename);

          await fs.writeFile(assetPath, response.data);

          // Update HTML to use local path
          $(`[src="${assetUrl}"]`).attr('src', `assets/${assetFilename}`);
          $(`[href="${assetUrl}"]`).attr('href', `assets/${assetFilename}`);

          totalAssets++;
        } catch (error) {
          console.warn(`Failed to download asset: ${assetUrl}`, error.message);
        }
      }

      // Process links to other pages if depth allows
      if (depth < config.maxDepth) {
        $('a[href]').each((_, element) => {
          const href = $(element).attr('href');

          try {
            if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
              href.startsWith('mailto:') || href.startsWith('tel:')) {
              return;
            }

            // Create absolute URL
            const linkedUrl = new URL(href, url).toString();
            const linkedUrlObj = new URL(linkedUrl);

            // Skip already processed URLs
            if (processedUrls.has(linkedUrl) || pendingUrls.has(linkedUrl)) {
              return;
            }

            // Skip different domains if following only same domain
            if (config.sameDomainOnly && linkedUrlObj.hostname !== urlObj.hostname) {
              return;
            }

            // Skip excluded extensions
            const extension = path.extname(linkedUrlObj.pathname).toLowerCase();
            if (config.excludeExtensions.includes(extension)) {
              return;
            }

            // Create local path for the linked page
            const pathSegments = linkedUrlObj.pathname.split('/').filter(Boolean);
            let localLinkedPath;

            if (pathSegments.length === 0) {
              // Root page of a domain
              localLinkedPath = `${sanitize(linkedUrlObj.hostname)}/index.html`;
            } else {
              const lastSegment = pathSegments[pathSegments.length - 1] || 'index';
              const filename = lastSegment.includes('.') ? lastSegment : `${lastSegment}.html`;
              const dirPath = pathSegments.slice(0, -1).map(segment => sanitize(segment)).join('/');

              if (dirPath) {
                localLinkedPath = `${sanitize(linkedUrlObj.hostname)}/${dirPath}/${sanitize(filename)}`;
              } else {
                localLinkedPath = `${sanitize(linkedUrlObj.hostname)}/${sanitize(filename)}`;
              }
            }

            // Update the link in HTML
            const relativePath = path.relative(
              path.dirname(path.join(pagesDir, localPath)),
              path.join(pagesDir, localLinkedPath)
            );

            $(element).attr('href', relativePath);

            // Add to pending URLs
            pendingUrls.set(linkedUrl, {
              depth: depth + 1,
              localPath: localLinkedPath
            });

          } catch (error) {
            console.warn(`Invalid link: ${href}`, error.message);
          }
        });
      }

      // Save modified HTML
      const modifiedHtml = $.html();
      await fs.writeFile(path.join(pagesDir, localPath), modifiedHtml);

    } catch (error) {
      console.error(`Failed to process URL: ${url}`, error.message);
      failedPages++;
    }
  }
}

// Export the original single page downloader as well
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

// Example usage
async function main() {
  try {
    const result = await downloadWebsite('https://www.tutorialspoint.com/html/index.htm', {
      maxDepth: 2,
      sameDomainOnly: true
    });
    console.log(`Website archived successfully: ${result.filename}`);
    console.log(`Stats: ${JSON.stringify(result.stats, null, 2)}`);
    await fs.writeFile(result.filename, result.zipBuffer);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();