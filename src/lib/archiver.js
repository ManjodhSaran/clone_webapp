import { downloadWebsite } from "./downloadWeb.js";
import fs from 'fs/promises';
import pQueue from 'p-queue';
import { finalizeArchive } from "./finalizeArchive.js";
import { logResults } from "../utils/log.util.js";
import { config } from '../config/index.js';

const getAuthHeaders = (token) => ({
  'Authorization': 'Bearer ' + token,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': config.archiver.userAgent
});

const initializeCrawlState = (outputPath) => ({
  processedUrls: new Map(),
  pendingUrls: new Map(),
  domainCounters: new Map(),
  queue: new pQueue({ concurrency: config.archiver.maxConcurrent }),
  assetHashes: new Map(),
  urlToLocalMap: new Map(),
  stats: {
    totalPages: 0,
    failedPages: 0,
    totalAssets: 0,
    duplicateAssets: 0
  },
  config: { ...config.archiver, assetAuthHeaders: getAuthHeaders(token) },
  outputPath
});

export const getLocalVersion = async ({ urls, outputPath, sitemap, token }) => {
  await fs.mkdir(outputPath, { recursive: true });
  const crawlState = initializeCrawlState(outputPath);
  
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