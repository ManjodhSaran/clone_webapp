import path from 'path';
import axios from 'axios';
import { URL } from 'url';
import fs from 'fs/promises';
import * as cheerio from 'cheerio';
import { processAsset } from './processAsset.js';

export const processUrl = async ({ url, depth, localPath, domainCounters,
    crawlState, config, failedPages
}) => {
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
            'link[rel="preload"][as="image"]': 'href',
            'link[rel="mask-icon"]': 'href',
            'link[rel="manifest"]': 'href',
            'link[rel="apple-touch-icon"]': 'href',
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
                        const promise = processAsset({ fullUrl, url, assetHashes: crawlState.assetHashes }).then(assetInfo => {
                            if (assetInfo) {
                                // Create a relative path from the HTML file to the asset
                                const relativePath = createRelativePath(localPath, assetInfo.path);

                                // Update HTML to use local path
                                $(element).attr(attr, relativePath);

                                // For CSS, we need to process it further to handle imports and url() references
                                if (contentType.includes('text/css') && !processedStylesheets.has(fullUrl)) {
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
                            const promise = processAsset({ fullUrl, url, assetHashes: crawlState.assetHashes }).then(assetInfo => {
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
                    if (crawlState.processedUrls.has(linkedUrl)) {
                        // Use the already assigned local path
                        const linkedLocalPath = crawlState.processedUrls.get(linkedUrl);

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

