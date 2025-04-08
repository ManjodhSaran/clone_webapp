import path from 'path';
import axios from 'axios';
import { URL } from 'url';
import crypto from 'crypto';
import fs from 'fs/promises';
import mime from 'mime-types';
import sanitize from 'sanitize-filename';
import { getSanitizedFilename } from '../utils/name.util.js';

export const processAsset = async ({ assetUrl, originPage, crawlState }) => {
    const {
        outputPath,
        processedUrls,
        pendingUrls,
        domainCounters,
        queue,
        assetHashes,
        urlToLocalMap,
        stats,
        config
    } = crawlState;

    try {
        // If already processed during this run
        if (urlToLocalMap.has(assetUrl)) {
            return {
                path: urlToLocalMap.get(assetUrl),
                url: assetUrl
            };
        }

        const assetUrlObj = new URL(assetUrl);
        const assetDomain = assetUrlObj.hostname;
        let assetPath = assetUrlObj.pathname;

        // Fallback filename if empty
        if (!assetPath || assetPath === '/') {
            assetPath = '/' + getSanitizedFilename(assetUrl);
        }

        // Determine guessed content-type extension
        let ext = path.extname(assetPath);
        if (!ext) {
            ext = mime.extension(mime.lookup(assetUrl) || '') || 'bin';
            assetPath += `.${ext}`;
        }

        const guessedLocalPath = path.join(
            outputPath,
            sanitize(assetDomain),
            assetPath.replace(/^\/+/, '')
        );

        // Check if file already exists
        if (await fileExists(guessedLocalPath)) {
            // Optional: read content to hash & register it for future deduplication
            const existingBuffer = await fs.readFile(guessedLocalPath);
            const contentHash = crypto.createHash('md5').update(existingBuffer).digest('hex');
            const assetInfo = { path: guessedLocalPath, url: assetUrl };
            crawlState.assetHashes.set(contentHash, assetInfo);
            crawlState.urlToLocalMap.set(assetUrl, guessedLocalPath);
            crawlState.stats.cachedAssets = (crawlState.stats.cachedAssets || 0) + 1;
            return assetInfo;
        }

        // Download asset
        const response = await axios.get(assetUrl, {
            responseType: 'arraybuffer',
            timeout: config.timeout,
            maxContentLength: config.maxAssetSize,
            headers: {
                'User-Agent': config.userAgent,
                ...(config.assetAuthHeaders || {})
            }
        });

        const contentType = response.headers['content-type'] || '';
        const contentHash = crypto.createHash('md5').update(response.data).digest('hex');

        // Skip if already saved by hash (deduplicated content)
        if (assetHashes.has(contentHash)) {
            crawlState.stats.duplicateAssets++;
            const assetInfo = assetHashes.get(contentHash);
            crawlState.urlToLocalMap.set(assetUrl, assetInfo.path);
            return assetInfo;
        }

        crawlState.stats.totalAssets++;

        // Save to disk, ensuring path uniqueness
        await fs.mkdir(path.dirname(guessedLocalPath), { recursive: true });
        let uniquePath = guessedLocalPath;
        let counter = 1;
        while (await fileExists(uniquePath)) {
            const ext = path.extname(guessedLocalPath);
            const base = path.basename(guessedLocalPath, ext);
            const dir = path.dirname(guessedLocalPath);
            uniquePath = path.join(dir, `${base}-${counter}${ext}`);
            counter++;
        }

        await fs.writeFile(uniquePath, response.data);

        const assetInfo = { path: uniquePath, url: assetUrl };
        crawlState.assetHashes.set(contentHash, assetInfo);
        crawlState.urlToLocalMap.set(assetUrl, uniquePath);

        return assetInfo;
    } catch (error) {
        crawlState.stats.failedPages++;
        console.warn(`Failed to download asset: ${assetUrl}`, error.message);
        return null;
    }
};


export const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};
