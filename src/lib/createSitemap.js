import path from 'path';
import fs from 'fs/promises';

export const createSitemap = async (outputPath, processedUrls) => {
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

  return path.join(outputPath, 'sitemap.html');
}