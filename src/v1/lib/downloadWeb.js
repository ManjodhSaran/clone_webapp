import pQueue from 'p-queue';
import { logResults } from '../utils/log.util.js';
import { prepareStartUrl } from './prepareStartUrl.js';
import { processPendingUrls } from './processPendingUrls.js';
import { finalizeArchive } from './finalizeArchive.js';

const DEFAULT_CONFIG = {
    maxDepth: 3,
    maxPagesPerDomain: 10000,
    maxTotalPages: 50000,
    maxConcurrent: 5,
    excludeExtensions: ['.pdf', '.zip', '.rar', '.exe', '.dmg', '.iso', '.apk', '.tar', '.gz', '.7z', '.mp3', '.mp4', '.avi', '.mov', '.mkv'],
    timeout: 30000,
    maxAssetSize: 50 * 1024 * 1024,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    sameDomainOnly: false
};





const initializeCrawlState = (config, outputPath) => ({
    processedUrls: new Map(),
    pendingUrls: new Map(),
    domainCounters: new Map(),
    queue: new pQueue({ concurrency: config.maxConcurrent }),
    assetHashes: new Map(),
    urlToLocalMap: new Map(),
    stats: {
        totalPages: 0,
        failedPages: 0,
        totalAssets: 0,
        duplicateAssets: 0
    },
    config,
    outputPath
});

export const downloadWebsite = async ({ startUrl, outputPath, options = {}, token, sitemap, index }) => {



    try {
        const { baseOutputDir, startUrlLocal } = await prepareStartUrl({ startUrl, outputPath });

        crawlState.pendingUrls.set(startUrl, { depth: 0, localPath: startUrlLocal });
        await processPendingUrls({ crawlState, baseOutputDir });

    } catch (error) {
        console.error(`Failed to download website: ${error.message}`);
        throw error;
    }
};
