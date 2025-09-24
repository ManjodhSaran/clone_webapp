import path from 'path';
import axios from 'axios';
import { URL } from 'url';
import fs from 'fs/promises';
import * as cheerio from 'cheerio';
import { processAsset } from './processAsset.js';
import { validateAndFixFilename, isValidFilename } from './filenameValidator.js';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced formatName function with better validation
 */
const formatName = (name) => {
    return validateAndFixFilename(name);
};

/**
 * Helper function to create safe asset filename
 */
const createSafeAssetPath = (assetUrl, baseUrl) => {
    try {
        const fullUrl = new URL(assetUrl, baseUrl).toString();
        const urlPath = new URL(fullUrl).pathname;

        // Split the path into directory and filename
        const dir = path.dirname(urlPath);
        const originalFilename = path.basename(urlPath);

        // Validate and fix the filename
        const safeFilename = formatName(originalFilename);

        // If filename is empty after cleaning, generate a default one
        if (!safeFilename || safeFilename === 'file') {
            const timestamp = Date.now();
            const ext = path.extname(originalFilename) || '.bin';
            return {
                fullUrl: fullUrl.replace(originalFilename, `asset_${timestamp}${ext}`),
                filename: `asset_${timestamp}${ext}`
            };
        }

        return {
            fullUrl: fullUrl.replace(originalFilename, safeFilename),
            filename: safeFilename
        };
    } catch (error) {
        console.warn('Error creating safe asset path:', error.message);
        return null;
    }
};

/**
 * Helper function to process CSS content and download referenced assets
 */
const processCssContent = async (cssContent, baseUrl, crawlState) => {
    let modifiedCss = cssContent;
    const assetPromises = [];

    // Enhanced regex to catch all URL references in CSS
    const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
    let match;

    while ((match = urlRegex.exec(cssContent)) !== null) {
        const assetUrl = match[1];

        // Skip data URLs and hash fragments
        if (assetUrl.startsWith('data:') || assetUrl.startsWith('#')) continue;

        try {
            const safeAssetInfo = createSafeAssetPath(assetUrl, baseUrl);

            if (safeAssetInfo) {
                const promise = processAsset({
                    assetUrl: safeAssetInfo.fullUrl,
                    url: baseUrl,
                    crawlState
                }).then(info => {
                    if (info) {
                        // Create relative path from CSS file location to asset
                        const relativePath = path.relative(path.dirname(info.cssPath || ''), info.path);
                        modifiedCss = modifiedCss.replace(match[0], `url(${relativePath})`);
                        crawlState.stats.totalAssets++;
                    }
                }).catch(error => {
                    console.error('Failed to process CSS asset:', safeAssetInfo.fullUrl, error.message);
                });

                assetPromises.push(promise);
            }
        } catch (error) {
            console.warn('Error processing CSS URL:', assetUrl, error.message);
        }
    }

    await Promise.all(assetPromises);
    return modifiedCss;
};

/**
 * Simple MathJax integration function
 */
const addMathJaxToHtml = ($) => {
    // Check if MathJax is already included
    const existingMathJax = $('script[src*="MathJax"], script[src*="mathjax"]');
    if (existingMathJax.length > 0) {
        console.log('MathJax already present, replacing with CDN version');
        existingMathJax.remove();
    }

    // Add MathJax script tag to head
    const mathJaxScript = '<script src="../../../../../../../../MathJax/MathJax.js?config=TeX-MML-AM_CHTML"></script>';

    // Add to head, or create head if it doesn't exist
    if ($('head').length === 0) {
        $('html').prepend('<head></head>');
    }
    $('head').append(mathJaxScript);

    console.log('Added MathJax integration to HTML file');
};

/**
 * Helper function to check if page likely contains math content
 */
const containsMathContent = ($) => {
    const mathIndicators = [
        /\$[^$]+\$/g,           // Inline math $...$
        /\$\$[^$]+\$\$/g,       // Display math $$...$$
        /\\begin\{[^}]+\}/g,    // LaTeX environments
        /\\end\{[^}]+\}/g,      // LaTeX environments
        /\\frac\{[^}]+\}/g,     // LaTeX fractions
        /\\sum_/g,              // LaTeX summation
        /\\int_/g,              // LaTeX integration
        /\\alpha|\\beta|\\gamma|\\delta|\\epsilon|\\theta|\\lambda|\\mu|\\pi|\\sigma|\\phi|\\psi|\\omega/g, // Greek letters
        /\\mathbf\{[^}]+\}/g,   // Bold math
        /\\mathit\{[^}]+\}/g,   // Italic math
        /\\mathrm\{[^}]+\}/g,   // Roman math
        /\\text\{[^}]+\}/g,     // Text in math
        /\\sqrt\{[^}]+\}/g,     // Square roots
        /\\overline\{[^}]+\}/g, // Overlines
        /\\underline\{[^}]+\}/g, // Underlines
    ];

    const htmlContent = $.html();
    return mathIndicators.some(pattern => pattern.test(htmlContent));
};

/**
 * Enhanced asset types including fonts
 */
const getAssetTypes = () => ({
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
    // Font-specific selectors
    'link[rel="preload"][as="font"][type="font/woff2"]': 'href',
    'link[rel="preload"][as="font"][type="font/woff"]': 'href',
    'link[rel="preload"][as="font"][type="font/ttf"]': 'href',
    'link[rel="preload"][as="font"][type="font/otf"]': 'href',
});

/**
 * Process assets with enhanced filename validation
 */
const processAssets = async ($, baseUrl, localPath, crawlState) => {
    const assetTypes = getAssetTypes();
    const assetPromises = [];

    for (const [selector, attr] of Object.entries(assetTypes)) {
        $(selector).each((_, el) => {
            const assetUrl = $(el).attr(attr);

            if (assetUrl && !assetUrl.startsWith('data:') && !assetUrl.startsWith('blob:') && !assetUrl.startsWith('#')) {
                const safeAssetInfo = createSafeAssetPath(assetUrl, baseUrl);

                if (safeAssetInfo) {
                    console.log('Processing asset:', safeAssetInfo.fullUrl);

                    const promise = processAsset({
                        assetUrl: safeAssetInfo.fullUrl,
                        url: baseUrl,
                        crawlState
                    }).then(async (info) => {
                        if (info) {
                            const relative = path.relative(path.dirname(localPath), info.path);
                            $(el).attr(attr, relative);
                            crawlState.stats.totalAssets++;

                            // Special handling for CSS files (including FontAwesome)
                            if (info.path.endsWith('.css')) {
                                try {
                                    const cssContent = await fs.readFile(info.path, 'utf8');
                                    const modifiedCss = await processCssContent(cssContent, safeAssetInfo.fullUrl, crawlState);
                                    await fs.writeFile(info.path, modifiedCss);
                                    console.log('Processed CSS file and its assets:', info.path);
                                } catch (error) {
                                    console.error('Error processing CSS file:', info.path, error.message);
                                }
                            }
                        }
                    }).catch(error => {
                        console.error('Failed to process asset:', safeAssetInfo.fullUrl, error.message);
                    });

                    assetPromises.push(promise);
                } else {
                    console.warn('Could not create safe path for asset:', assetUrl);
                }
            }
        });
    }

    return assetPromises;
};

/**
 * Process inline CSS styles
 */
const processInlineStyles = async ($, baseUrl, crawlState) => {
    const stylePromises = [];

    // Process <style> tags
    $('style').each((_, el) => {
        const css = $(el).html();
        if (!css) return;

        const cssPromise = processCssContent(css, baseUrl, crawlState).then(modifiedCss => {
            $(el).html(modifiedCss);
        }).catch(error => {
            console.error('Error processing inline CSS:', error.message);
        });

        stylePromises.push(cssPromise);
    });

    // Process style attributes on individual elements
    $('[style]').each((_, el) => {
        const style = $(el).attr('style');
        if (!style) return;

        const stylePromise = processCssContent(style, baseUrl, crawlState).then(modifiedStyle => {
            $(el).attr('style', modifiedStyle);
        }).catch(error => {
            console.error('Error processing inline style:', error.message);
        });

        stylePromises.push(stylePromise);
    });

    return stylePromises;
};

/**
 * Process links for next depth level
 */
const processLinks = ($, baseUrl, localPath, depth, crawlState, baseOutputDir) => {
    const { processedUrls, pendingUrls, config } = crawlState;

    if (depth >= config.maxDepth) return;

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') ||
            href.startsWith('mailto:') || href.startsWith('tel:')) return;

        try {
            const linkedUrl = new URL(href, baseUrl).toString();
            const ext = path.extname(linkedUrl).toLowerCase();
            if (config.excludeExtensions.includes(ext)) return;

            if (processedUrls.has(linkedUrl)) {
                const relative = path.relative(path.dirname(localPath), processedUrls.get(linkedUrl));
                $(el).attr('href', relative);
            } else if (pendingUrls.has(linkedUrl)) {
                const relative = path.relative(path.dirname(localPath), pendingUrls.get(linkedUrl).localPath);
                $(el).attr('href', relative);
            } else {
                // Create safe path for the linked page
                const urlPath = linkedUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
                const safePath = urlPath.split('/').map(segment => formatName(segment)).join('/');
                const newLocalPath = path.join(baseOutputDir, safePath, 'index.html');
                const relative = path.relative(path.dirname(localPath), newLocalPath);
                $(el).attr('href', relative);
                pendingUrls.set(linkedUrl, { depth: depth + 1, localPath: newLocalPath });
            }
        } catch (error) {
            console.warn('Error processing link:', href, error.message);
        }
    });
};

/**
 * Remove problematic elements from HTML
 */
const removeProblematicElements = ($) => {
    $('script[src*="analytics"]').remove();
    $('script[src*="google-analytics"]').remove();
    $('script[src*="googletagmanager"]').remove();
    $('script[src*="facebook"]').remove();
    $('script[src*="twitter"]').remove();
    $('iframe[src*="youtube"]').remove();

    // Remove srcset attribute from all images
    $('img').removeAttr('srcset');
    $('source').removeAttr('srcset');
};

/**
 * Update existing absolute URLs to relative paths
 */
const updateAbsoluteUrls = ($, baseUrl, localPath, crawlState) => {
    const { urlToLocalMap } = crawlState;

    $('[href], [src]').each((_, el) => {
        ['href', 'src'].forEach(attr => {
            const val = $(el).attr(attr);
            if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
                try {
                    const fullUrl = new URL(val, baseUrl).toString();
                    if (urlToLocalMap.has(fullUrl)) {
                        const relative = path.relative(path.dirname(localPath), urlToLocalMap.get(fullUrl));
                        $(el).attr(attr, relative);
                    }
                } catch (error) {
                    console.warn('Error updating absolute URL:', val, error.message);
                }
            }
        });
    });
};

/**
 * Main URL processing function
 */
export const processUrl = async ({ url, depth, localPath, crawlState, baseOutputDir }) => {
    const { domainCounters, stats: { totalPages }, config } = crawlState;

    if (url.includes('select?TID')) {
        const topic = url.split('select?TID=')[1].split('&ActionType')[0];
        localPath = localPath.replace('select/index.html', `select/${topic}/questions.html`);
    }

    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Check domain limits
    if (!domainCounters.has(domain)) domainCounters.set(domain, 0);
    const domainCount = domainCounters.get(domain);
    if (domainCount >= config.maxPagesPerDomain) return;
    domainCounters.set(domain, domainCount + 1);
    crawlState.stats.totalPages++;

    console.log(`[${totalPages}] Processing: ${url} (depth ${depth})`);

    try {
        // Create directory and fetch content
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        const response = await axios.get(url, {
            timeout: config.timeout,
            headers: { 'User-Agent': config.userAgent, ...(config.assetAuthHeaders || {}) }
        });

        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('text/html')) {
            console.log(`Skipping non-HTML content: ${url} (${contentType})`);
            return;
        }

        // Parse HTML
        const html = response.data;
        const $ = cheerio.load(html);

        // Remove problematic elements
        removeProblematicElements($);

        // Determine base URL
        let baseUrl = url;
        const baseTag = $('base[href]');
        if (baseTag.length) {
            try {
                baseUrl = new URL(baseTag.attr('href'), url).toString();
            } catch (error) {
                console.warn('Error parsing base tag:', error.message);
            }
        }

        // Update existing absolute URLs to relative paths
        updateAbsoluteUrls($, baseUrl, localPath, crawlState);

        // Process assets
        const assetPromises = await processAssets($, baseUrl, localPath, crawlState);

        // Process inline styles
        const stylePromises = await processInlineStyles($, baseUrl, crawlState);

        // Wait for all asset and style processing to complete
        await Promise.all([...assetPromises, ...stylePromises]);

        // Process links for next depth level
        processLinks($, baseUrl, localPath, depth, crawlState, baseOutputDir);

        // Add MathJax to pages that contain mathematical content
        if (containsMathContent($)) {
            console.log('Math content detected, adding MathJax to:', url);
            addMathJaxToHtml($);
        }

        // Save processed HTML
        await fs.writeFile(localPath, $.html());
        console.log(`Successfully processed: ${url}`);

    } catch (err) {
        crawlState.stats.failedPages++;
        console.error(`Failed to process URL: ${url}`, err.message);
    }
};