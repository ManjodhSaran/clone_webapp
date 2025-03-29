import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import mime from 'mime-types';
import sanitize from 'sanitize-filename';
import AdmZip from 'adm-zip';
import { URL } from 'url';
import pQueue from 'p-queue';

// Configuration options
const CONFIG = {
  maxDepth: 3,                   // How many levels of links to follow
  maxPagesPerDomain: 10000,        // Maximum pages to download per domain
  maxTotalPages: 50000,            // Maximum total pages to download
  maxConcurrent: 5,              // Maximum concurrent downloads
  excludeExtensions: ['.pdf', '.zip', '.rar', '.exe', '.dmg', '.iso'],
  timeout: 30000,                // 30 seconds timeout
  maxAssetSize: 50 * 1024 * 1024, // 50MB max for assets
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

export async function downloadWebsite(startUrl, outputPath, options = {}) {
  // Merge default config with provided options
  const config = { ...CONFIG, ...options };

  // Ensure output directory exists
  await fs.mkdir(outputPath, { recursive: true });

  // Create directory structure
  const pagesDir = path.join(outputPath, 'pages');
  const assetsDir = path.join(outputPath, 'assets');
  const cssDir = path.join(assetsDir, 'css');
  const jsDir = path.join(assetsDir, 'js');
  const imgDir = path.join(assetsDir, 'img');
  const fontDir = path.join(assetsDir, 'fonts');
  const otherDir = path.join(assetsDir, 'other');

  await fs.mkdir(pagesDir, { recursive: true });
  await fs.mkdir(cssDir, { recursive: true });
  await fs.mkdir(jsDir, { recursive: true });
  await fs.mkdir(imgDir, { recursive: true });
  await fs.mkdir(fontDir, { recursive: true });
  await fs.mkdir(otherDir, { recursive: true });

  // Initialize tracking variables
  const processedUrls = new Map(); // url -> localPath
  const pendingUrls = new Map(); // url -> { depth, localPath }
  const domainCounters = new Map();
  const queue = new pQueue({ concurrency: config.maxConcurrent });

  // Asset tracking for deduplication
  const assetHashes = new Map(); // hash -> { path, type, url }
  const urlToLocalMap = new Map(); // originalUrl -> localPath (for both pages and assets)

  let totalPages = 0;
  let failedPages = 0;
  let totalAssets = 0;
  let duplicateAssets = 0;

  try {
    // Parse starting URL
    const startUrlObj = new URL(startUrl);
    const baseDomain = startUrlObj.hostname;

    // Create the base index.html path - updated to include domain name folder
    const domainDir = path.join(pagesDir, sanitize(baseDomain));
    await fs.mkdir(domainDir, { recursive: true });

    // For the starting URL, place it in a domain-specific folder
    const startUrlLocal = path.join(domainDir, 'index.html');

    // Add starting URL to queue
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

        // Add to processed with its local path
        processedUrls.set(url, localPath);

        // Map this URL to its local path for reference in links
        urlToLocalMap.set(url, localPath);

        // Process URL
        batchPromises.push(queue.add(() => processUrl(url, depth, localPath)));

        // Check total pages limit
        if (totalPages >= config.maxTotalPages) break;
      }

      // Wait for batch to complete
      await Promise.all(batchPromises);
    }

    // Create a manifest file with metadata
    const manifest = {
      originalUrl: startUrl,
      dateArchived: new Date().toISOString(),
      stats: {
        totalPages,
        failedPages,
        totalAssets,
        uniqueAssets: totalAssets - duplicateAssets,
        duplicateAssets
      },
      domains: Object.fromEntries(domainCounters),
      config
    };

    await fs.writeFile(
      path.join(outputPath, 'archive-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Create a sitemap HTML file
    await createSitemap(outputPath, processedUrls);

    // Create a zip file of the entire output
    const zipFilePath = path.join(path.dirname(outputPath), `${path.basename(outputPath)}.zip`);
    await createZipArchive(outputPath, zipFilePath);

    console.log(`\nArchiving complete!`);
    console.log(`Total pages: ${totalPages}`);
    console.log(`Total unique assets: ${totalAssets - duplicateAssets}`);
    console.log(`Duplicate assets (saved): ${duplicateAssets}`);
    console.log(`Failed pages: ${failedPages}`);
    console.log(`Output saved to: ${outputPath}`);
    console.log(`Zip archive created: ${zipFilePath}`);

    return {
      outputPath,
      zipFilePath,
      stats: {
        totalPages,
        failedPages,
        totalAssets,
        uniqueAssets: totalAssets - duplicateAssets,
        duplicateAssets,
        processedUrls: Array.from(processedUrls.keys())
      }
    };
  } catch (error) {
    console.error(`Failed to download website: ${error.message}`);
    throw error;
  }

  // Helper function to create a zip archive
  async function createZipArchive(sourceDir, zipFilePath) {
    const zip = new AdmZip();

    // Add all files to the zip
    zip.addLocalFolder(sourceDir);

    // Save the zip file
    zip.writeZip(zipFilePath);

    return zipFilePath;
  }

  // Helper function to create a sitemap
  async function createSitemap(outputPath, processedUrls) {
    let sitemapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Site Archive Sitemap</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        ul { list-style-type: none; padding: 0; }
        li { margin: 5px 0; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>Site Archive Sitemap</h1>
      <p>This archive contains ${processedUrls.size} pages.</p>
      <ul>
    `;

    // Add links to all pages
    for (const [url, localPath] of processedUrls.entries()) {
      // Use relative path with proper prefix
      const relativePath = path.relative(outputPath, localPath)
        .replace(/\\/g, '/');

      // Add "./" prefix for correct relative paths
      const prefixedPath = `./${relativePath}`;

      const title = url.replace(/^https?:\/\//, '');
      sitemapHtml += `    <li><a href="${prefixedPath}">${title}</a></li>\n`;
    }

    sitemapHtml += `
      </ul>
    </body>
    </html>
    `;

    await fs.writeFile(path.join(outputPath, 'sitemap.html'), sitemapHtml);
  }

  // Helper function to determine asset type and directory based on content type
  function getAssetTypeAndDir(contentType, urlPath) {
    const extension = path.extname(urlPath).toLowerCase();

    if (contentType.includes('text/css') || extension === '.css') {
      return { type: 'css', dir: cssDir };
    } else if (contentType.includes('javascript') || extension === '.js') {
      return { type: 'js', dir: jsDir };
    } else if (contentType.includes('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp'].includes(extension)) {
      return { type: 'img', dir: imgDir };
    } else if (contentType.includes('font') || ['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(extension)) {
      return { type: 'font', dir: fontDir };
    } else {
      return { type: 'other', dir: otherDir };
    }
  }

  // Helper function to get sanitized filename
  function getSanitizedFilename(url, contentType) {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let filename = path.basename(pathname);

    // If no filename or just a slash, generate one based on the URL
    if (!filename || filename === '/' || filename === '') {
      const extension = mime.extension(contentType) || 'txt';
      const urlHash = crypto.createHash('md5').update(url).digest('hex').slice(0, 8);
      filename = `${urlObj.hostname}-${urlHash}.${extension}`;
    }

    // Ensure the filename has an extension
    if (!path.extname(filename) && contentType) {
      const extension = mime.extension(contentType);
      if (extension) {
        filename = `${filename}.${extension}`;
      }
    }

    return sanitize(filename);
  }

  // Helper function to download and process an asset
  async function processAsset(assetUrl, originPage) {
    try {
      // If we've already processed this URL, return the mapped local path
      if (urlToLocalMap.has(assetUrl)) {
        return {
          path: urlToLocalMap.get(assetUrl),
          url: assetUrl
        };
      }

      const response = await axios.get(assetUrl, {
        responseType: 'arraybuffer',
        timeout: config.timeout,
        maxContentLength: config.maxAssetSize,
        headers: {
          'User-Agent': config.userAgent
        }
      });

      const contentType = response.headers['content-type'] || '';
      const { type, dir } = getAssetTypeAndDir(contentType, assetUrl);

      // Calculate hash for deduplication
      const contentHash = crypto.createHash('md5').update(response.data).digest('hex');

      // Check if we've already downloaded this exact asset
      if (assetHashes.has(contentHash)) {
        duplicateAssets++;
        const assetInfo = assetHashes.get(contentHash);
        // Map this URL to the existing file
        urlToLocalMap.set(assetUrl, assetInfo.path);
        return assetInfo;
      }

      // This is a new unique asset
      totalAssets++;
      const filename = getSanitizedFilename(assetUrl, contentType);

      // Ensure unique filenames within the same asset type directory
      let uniqueFilename = filename;
      let counter = 1;

      while (await fileExists(path.join(dir, uniqueFilename))) {
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        uniqueFilename = `${base}-${counter}${ext}`;
        counter++;
      }

      const assetPath = path.join(dir, uniqueFilename);

      // Make sure the directory exists before writing file
      await fs.mkdir(path.dirname(assetPath), { recursive: true });
      await fs.writeFile(assetPath, response.data);

      // Store the full path for use in HTML
      const assetInfo = { path: assetPath, type, url: assetUrl };
      assetHashes.set(contentHash, assetInfo);

      // Map this URL to its local path
      urlToLocalMap.set(assetUrl, assetPath);

      return assetInfo;
    } catch (error) {
      console.warn(`Failed to download asset: ${assetUrl}`, error.message);
      return null;
    }
  }

  // Helper function to check if a file exists
  async function fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Helper function to create a sanitized local path for a URL
  function createLocalPath(url, depth) {
    const urlObj = new URL(url);
    const hostname = sanitize(urlObj.hostname);
    let pathname = urlObj.pathname;

    // Clean up pathname
    if (pathname.endsWith('/')) {
      pathname += 'index.html';
    } else if (!path.extname(pathname)) {
      pathname += '.html';
    }

    // Extract filename and directory path
    const filename = path.basename(pathname);
    const dirPath = path.dirname(pathname);

    // Always include domain name in path structure to avoid collisions
    const domainDir = path.join(pagesDir, hostname);

    // Create path that includes domain and pathname
    let finalDirPath = domainDir;
    if (dirPath !== '/' && dirPath !== '.') {
      // Remove leading slash if present
      const cleanDirPath = dirPath.startsWith('/') ? dirPath.slice(1) : dirPath;
      finalDirPath = path.join(domainDir, cleanDirPath);
    }

    // Generate the full local path
    const localPath = path.join(finalDirPath, filename);

    return localPath;
  }

  // Helper function to create relative path with proper "./pages/" prefix
  function createRelativePath(fromPath, toPath) {
    let relativePath = path.relative(path.dirname(fromPath), toPath).replace(/\\/g, '/');

    // If the path doesn't start with "./" add it
    if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
      relativePath = `./${relativePath}`;
    }

    return relativePath;
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
      // Ensure directory exists
      const pageDir = path.dirname(localPath);
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

      // Remove problematic elements
      $('script[src*="analytics"]').remove();
      $('script[src*="google-analytics"]').remove();
      $('script[src*="googletagmanager"]').remove();
      $('script[src*="facebook"]').remove();
      $('script[src*="twitter"]').remove();
      $('iframe[src*="youtube"]').remove(); // Can optionally keep if video archiving is needed

      // Remove srcset attribute from all images
      $('img').removeAttr('srcset');
      $('source').removeAttr('srcset');

      // Process base tag if exists
      let baseUrl = url;
      const baseTag = $('base[href]');
      if (baseTag.length) {
        try {
          baseUrl = new URL(baseTag.attr('href'), url).toString();
        } catch (e) {
          console.warn(`Invalid base URL: ${baseTag.attr('href')}`);
        }
      }

      // Process different asset types
      const assetTypes = {
        'img[src]': 'src',
        'link[rel="stylesheet"]': 'href',
        'script[src]': 'src',
        'video[src]': 'src',
        'source[src]': 'src',
        'audio[src]': 'src',
        'link[rel="icon"]': 'href',
        'link[rel="shortcut icon"]': 'href',
        'link[rel="preload"][as="style"]': 'href',
        'link[rel="preload"][as="script"]': 'href',
        'link[rel="preload"][as="font"]': 'href',
        'link[rel="preload"][as="image"]': 'href'
      };

      // Process all assets in parallel for speed
      const assetPromises = [];

      // Process CSS imports
      const processedStylesheets = new Set();

      // First replace absolute HTTP/HTTPS URLs in href and src attributes
      // if they're already in our mapping
      $('[href], [src]').each((_, element) => {
        const attrNames = ['href', 'src'];
        attrNames.forEach(attrName => {
          const attrValue = $(element).attr(attrName);
          if (attrValue && (attrValue.startsWith('http://') || attrValue.startsWith('https://'))) {
            try {
              const fullUrl = new URL(attrValue, baseUrl).toString();

              // Check if we already have a local path for this URL
              if (urlToLocalMap.has(fullUrl)) {
                const localUrl = urlToLocalMap.get(fullUrl);
                const relativePath = createRelativePath(localPath, localUrl);

                $(element).attr(attrName, relativePath);
              }
            } catch (error) {
              // Ignore invalid URLs
            }
          }
        });
      });

      // Collect assets
      for (const [selector, attr] of Object.entries(assetTypes)) {
        $(selector).each((_, element) => {
          const assetUrl = $(element).attr(attr);
          if (assetUrl && !assetUrl.startsWith('data:') && !assetUrl.startsWith('blob:') && !assetUrl.startsWith('#')) {
            try {
              const fullUrl = new URL(assetUrl, baseUrl).toString();

              // Process this asset and store the promise
              const promise = processAsset(fullUrl, url).then(assetInfo => {
                if (assetInfo) {
                  // Create a relative path from the HTML file to the asset
                  const relativePath = createRelativePath(localPath, assetInfo.path);

                  // Update HTML to use local path
                  $(element).attr(attr, relativePath);

                  // For CSS, we need to process it further to handle imports and url() references
                  if (assetInfo.type === 'css' && !processedStylesheets.has(fullUrl)) {
                    processedStylesheets.add(fullUrl);

                    // Add a promise to process the CSS file
                    const cssPromise = processCssFile(assetInfo.path, baseUrl);
                    assetPromises.push(cssPromise);
                  }
                }
                return assetInfo;
              });

              assetPromises.push(promise);
            } catch (error) {
              console.warn(`Invalid asset URL: ${assetUrl}`, error.message);
            }
          }
        });
      }

      // Process CSS to handle inline url() references
      $('style').each((_, element) => {
        const cssContent = $(element).html();
        if (cssContent) {
          // Find all url() references in the CSS
          const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
          let match;
          let modifiedCss = cssContent;

          const cssAssetPromises = [];

          while ((match = urlRegex.exec(cssContent)) !== null) {
            const cssAssetUrl = match[1];
            if (cssAssetUrl && !cssAssetUrl.startsWith('data:') && !cssAssetUrl.startsWith('#')) {
              try {
                const fullUrl = new URL(cssAssetUrl, baseUrl).toString();

                // Process this asset
                const promise = processAsset(fullUrl, url).then(assetInfo => {
                  if (assetInfo) {
                    // Create a relative path from the HTML file to the asset
                    const relativePath = createRelativePath(localPath, assetInfo.path);

                    // Replace the URL in the CSS
                    modifiedCss = modifiedCss.replace(
                      new RegExp(`url\\(['"]?${cssAssetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?\\)`, 'g'),
                      `url(${relativePath})`
                    );
                  }
                  return assetInfo;
                });

                cssAssetPromises.push(promise);
              } catch (error) {
                console.warn(`Invalid CSS asset URL: ${cssAssetUrl}`, error.message);
              }
            }
          }

          // Wait for all CSS assets to be processed
          Promise.all(cssAssetPromises).then(() => {
            $(element).html(modifiedCss);
          });

          assetPromises.push(...cssAssetPromises);
        }
      });

      // Wait for all assets to be processed
      await Promise.all(assetPromises);

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
            const linkedUrl = new URL(href, baseUrl).toString();
            const linkedUrlObj = new URL(linkedUrl);

            // Skip different domains if following only same domain
            if (config.sameDomainOnly && linkedUrlObj.hostname !== urlObj.hostname) {
              return;
            }

            // Skip excluded extensions
            const extension = path.extname(linkedUrlObj.pathname).toLowerCase();
            if (config.excludeExtensions.includes(extension)) {
              return;
            }

            // If this URL has already been processed or is pending
            if (processedUrls.has(linkedUrl)) {
              // Use the already assigned local path
              const linkedLocalPath = processedUrls.get(linkedUrl);

              // Create a relative path from this page to the linked page
              const relativePath = createRelativePath(localPath, linkedLocalPath);

              // Update the link
              $(element).attr('href', relativePath);
            }
            else if (pendingUrls.has(linkedUrl)) {
              // URL is pending, use its assigned local path
              const linkedLocalPath = pendingUrls.get(linkedUrl).localPath;

              // Create a relative path
              const relativePath = createRelativePath(localPath, linkedLocalPath);

              // Update the link
              $(element).attr('href', relativePath);
            }
            else {
              // This is a new URL - create a local path for it
              const linkedLocalPath = createLocalPath(linkedUrl, depth + 1);

              // Create a relative path
              const relativePath = createRelativePath(localPath, linkedLocalPath);

              // Update the link
              $(element).attr('href', relativePath);

              // Add to pending URLs
              pendingUrls.set(linkedUrl, {
                depth: depth + 1,
                localPath: linkedLocalPath
              });
            }

          } catch (error) {
            console.warn(`Invalid link: ${href}`, error.message);
          }
        });
      }

      // Additional pass to replace any remaining external links with local ones if possible
      $('a[href^="http"], a[href^="https"]').each((_, element) => {
        const href = $(element).attr('href');
        try {
          const fullUrl = new URL(href, baseUrl).toString();

          // Check if we already have a local path for this URL
          if (urlToLocalMap.has(fullUrl)) {
            const localUrl = urlToLocalMap.get(fullUrl);
            const relativePath = createRelativePath(localPath, localUrl);

            $(element).attr('href', relativePath);
          }
        } catch (error) {
          // Ignore invalid URLs
        }
      });

      // Save modified HTML - ensure directory exists first
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      const modifiedHtml = $.html();
      await fs.writeFile(localPath, modifiedHtml);

    } catch (error) {
      console.error(`Failed to process URL: ${url}`, error.message);
      failedPages++;
    }
  }

  // Helper function to process a CSS file for url() references
  async function processCssFile(cssFilePath, baseUrl) {
    try {
      // Ensure the directory exists before attempting to read
      await fs.mkdir(path.dirname(cssFilePath), { recursive: true });

      // Read the file, if it exists
      let cssContent;
      try {
        cssContent = await fs.readFile(cssFilePath, 'utf8');
      } catch (err) {
        console.warn(`Could not read CSS file ${cssFilePath}: ${err.message}`);
        return;
      }

      // Find all url() and @import references
      const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
      const importRegex = /@import\s+['"]([^'"]+)['"]/g;

      let modifiedCss = cssContent;
      const assetPromises = [];

      // Process url() references
      let match;
      while ((match = urlRegex.exec(cssContent)) !== null) {
        const cssAssetUrl = match[1];
        if (cssAssetUrl && !cssAssetUrl.startsWith('data:') && !cssAssetUrl.startsWith('#')) {
          try {
            const fullUrl = new URL(cssAssetUrl, baseUrl).toString();

            // Process this asset
            const promise = processAsset(fullUrl, baseUrl).then(assetInfo => {
              if (assetInfo) {
                // Create a relative path from the CSS file to the asset
                const relativePath = createRelativePath(cssFilePath, assetInfo.path);

                // Replace the URL in the CSS
                modifiedCss = modifiedCss.replace(
                  new RegExp(`url\\(['"]?${cssAssetUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?\\)`, 'g'),
                  `url(${relativePath})`
                );
              }
              return assetInfo;
            });

            assetPromises.push(promise);
          } catch (error) {
            console.warn(`Invalid CSS asset URL: ${cssAssetUrl}`, error.message);
          }
        }
      }

      // Process @import references
      while ((match = importRegex.exec(cssContent)) !== null) {
        const importUrl = match[1];
        try {
          const fullUrl = new URL(importUrl, baseUrl).toString();

          // Process this asset as a CSS file
          const promise = processAsset(fullUrl, baseUrl).then(assetInfo => {
            if (assetInfo) {
              // Create a relative path from the CSS file to the imported CSS
              const relativePath = createRelativePath(cssFilePath, assetInfo.path);

              // Replace the import in the CSS
              modifiedCss = modifiedCss.replace(
                new RegExp(`@import\\s+['"]${importUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
                `@import "${relativePath}"`
              );

              // Also process the imported CSS
              return processCssFile(assetInfo.path, fullUrl);
            }
          });

          assetPromises.push(promise);
        } catch (error) {
          console.warn(`Invalid CSS import URL: ${importUrl}`, error.message);
        }
      }

      // Wait for all assets to be processed
      await Promise.all(assetPromises);

      // Save the modified CSS
      await fs.writeFile(cssFilePath, modifiedCss);

    } catch (error) {
      console.warn(`Failed to process CSS file ${cssFilePath}:`, error.message);
    }
  }
}

// Example usage
async function main() {
  try {
    const outputPath = path.join(process.cwd(), 'output');
    const result = await downloadWebsite('https://bollyflix.dog/', outputPath, {
      maxDepth: 2,
      sameDomainOnly: true
    });
    console.log(`\nWebsite archived successfully!`);
    console.log(`Archive created at: ${result.zipFilePath}`);
    console.log(`Stats: ${JSON.stringify(result.stats, null, 2)}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Uncomment to run directly
main();