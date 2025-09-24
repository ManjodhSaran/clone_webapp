import { downloadWebsite } from "./downloadWeb.js";
import fs from 'fs/promises';
import pQueue from 'p-queue';
import { finalizeArchive } from "./finalizeArchive.js";
import { logResults } from "../utils/log.util.js";

const getAuthHeaders = (token) => ({
    'Authorization': token,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
});

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


export const getLocalVersion = async ({ urls, outputPath, sitemap, token }) => {
    await fs.mkdir(outputPath, { recursive: true });
    const options = {
        maxDepth: 2,
        sameDomainOnly: true,
    }
    const config = { ...DEFAULT_CONFIG, ...options, assetAuthHeaders: getAuthHeaders(token) };
    const crawlState = initializeCrawlState(config, outputPath);
    try {
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            await downloadWebsite({
                startUrl: url,
                outputPath,
                crawlState
            });
        }
        const result = await finalizeArchive({ crawlState, sitemap });
        logResults(result);

        return result;

    } catch (error) {
        console.error('Error during website download:', error);
        throw error;
    }
};