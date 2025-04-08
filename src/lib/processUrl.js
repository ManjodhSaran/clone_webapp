import path from 'path';
import axios from 'axios';
import { URL } from 'url';
import fs from 'fs/promises';
import * as cheerio from 'cheerio';
import { processAsset } from './processAsset.js';

export const processUrl = async ({ url, depth, localPath, crawlState, baseOutputDir }) => {
    let { processedUrls, pendingUrls, domainCounters, urlToLocalMap, stats: { totalPages, failedPages, totalAssets, }, config } = crawlState
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    if (!domainCounters.has(domain)) domainCounters.set(domain, 0);
    const domainCount = domainCounters.get(domain);
    if (domainCount >= config.maxPagesPerDomain) return;
    domainCounters.set(domain, domainCount + 1);
    crawlState.stats.totalPages++;

    console.log(`[${totalPages}] Processing: ${url} (depth ${depth})`);

    try {
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        const response = await axios.get(url, {
            timeout: config.timeout,
            headers: { 'User-Agent': config.userAgent }
        });

        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('text/html')) {
            console.log(`Skipping non-HTML content: ${url} (${contentType})`);
            return;
        }

        const html = response.data;

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


        let baseUrl = url;
        const baseTag = $('base[href]');
        if (baseTag.length) {
            try { baseUrl = new URL(baseTag.attr('href'), url).toString(); } catch { }
        }


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

        const assetPromises = [];

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
                    } catch { }
                }
            });
        });

        for (const [selector, attr] of Object.entries(assetTypes)) {
            $(selector).each((_, el) => {
                const assetUrl = $(el).attr(attr);
                if (assetUrl && !assetUrl.startsWith('data:') && !assetUrl.startsWith('blob:') && !assetUrl.startsWith('#')) {
                    try {
                        const fullUrl = new URL(assetUrl, baseUrl).toString();
                        const promise = processAsset({ assetUrl: fullUrl, url, crawlState }).then(info => {
                            if (info) {
                                const relative = path.relative(path.dirname(localPath), info.path);
                                $(el).attr(attr, relative);
                                crawlState.stats.totalAssets++;

                            }
                        });
                        assetPromises.push(promise);
                    } catch { }
                }
            });
        }

        $('style').each((_, el) => {
            const css = $(el).html();
            if (!css) return;
            let modified = css;
            const regex = /url\(['"]?([^'")]+)['"]?\)/g;
            const cssPromises = [];
            let match;
            while ((match = regex.exec(css)) !== null) {
                const cssUrl = match[1];
                if (cssUrl.startsWith('data:') || cssUrl.startsWith('#')) continue;
                try {
                    const fullUrl = new URL(cssUrl, baseUrl).toString();
                    const promise = processAsset({ assetUrl: fullUrl, url, crawlState }).then(info => {
                        if (info) {
                            const relative = path.relative(path.dirname(localPath), info.path);
                            modified = modified.replace(match?.[0], `url(${relative})`);
                            crawlState.stats.totalAssets++;
                        }
                    });
                    cssPromises.push(promise);
                } catch { }
            }
            assetPromises.push(...cssPromises);
            Promise.all(cssPromises).then(() => $(el).html(modified));
        });

        await Promise.all(assetPromises);

        if (depth < config.maxDepth) {
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
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
                        const newLocalPath = path.join(baseOutputDir, linkedUrl.replace(/^https?:\/\//, '').replace(/\/+$/, ''), 'index.html');
                        const relative = path.relative(path.dirname(localPath), newLocalPath);
                        $(el).attr('href', relative);
                        pendingUrls.set(linkedUrl, { depth: depth + 1, localPath: newLocalPath });
                    }
                } catch { }
            });
        }

        await fs.writeFile(localPath, $.html());
    } catch (err) {
        crawlState.stats.failedPages++;
        console.error(`Failed to process URL: ${url}`, err.message);
    }
};
