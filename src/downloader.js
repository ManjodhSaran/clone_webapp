import path from 'path';
import pQueue from 'p-queue';
import fs from 'fs/promises';
import createZipArchive from './utils/zip.util.js';
import { createSitemap } from './lib/createSitemap.js';
import { processUrl } from './lib/processUrl.js';
import { logResults } from './utils/log.util.js';
import { prepareStartUrl } from './lib/prepareStartUrl.js';
import { processPendingUrls } from './lib/processPendingUrls.js';

// Default configuration
const DEFAULT_CONFIG = {
  maxDepth: 3,
  maxPagesPerDomain: 10000,
  maxTotalPages: 50000,
  maxConcurrent: 5,
  excludeExtensions: ['.pdf', '.zip', '.rar', '.exe', '.dmg', '.iso'],
  timeout: 30000,
  maxAssetSize: 50 * 1024 * 1024,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  sameDomainOnly: false
};

// Auth headers for assets

const token = "eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJpYmxpYkpXVCIsInN1YiI6IntcImxvZ2luTmFtZVwiOlwibmVoYS5hcnJvd1wiLFwidXNlclwiOntcImlkXCI6XCIxMDNcIixcImxvZ2luTmFtZVwiOlwibmVoYS5hcnJvd1wiLFwiaWRTdHVkZW50XCI6XCJcIixcImZpcnN0TmFtZVwiOlwiTmVoYVwiLFwibGFzdE5hbWVcIjpcIkFycm93XCIsXCJmYXRoZXJOYW1lXCI6XCJcIixcInBob25lTnVtYmVyXCI6XCI2Mzk1OTUyMjcxXCIsXCJlbWFpbEFkZHJlc3NcIjpcImlibGliLmluZm9AZ21haWwuY29tXCIsXCJiaXJ0aERhdGVcIjpcIjIwMDAtMDEtMDFcIixcImdlbmRlclwiOlwiRkVNQUxFXCIsXCJ1c2VySW1hZ2VcIjpcImh0dHBzOi8vZ3JhZGVwbHVzLnMzLmFwLXNvdXRoLTEuYW1hem9uYXdzLmNvbS91c2Vycy9hc3NldHMvaW1nL3VzZXJzL2Nyb3BwZWQ5MjE0MzgxMjk5MjI3Nzg1ODg1LmpwZ1wiLFwidXNlclR5cGVcIjpcIkNMSUVOVF9BRE1JTlwiLFwiaWRTY2hvb2xcIjpcIjQ4XCIsXCJzY2hvb2xOYW1lXCI6bnVsbCxcImN1cnJcIjpcIlVQU1NTQ1wiLFwiY3VyclllYXJcIjpcIlVQIExla2hwYWxcIixcInllYXJHcm91cFwiOlwiXCIsXCJpZEFkZHJlc3NcIjpcIjM1OVwiLFwibG9jYWxBZGRyZXNzXCI6XCJVR0YgMDMsIFRyaW5pdHkgU3F1YXJlXCIsXCJpc0xvY2tlZFwiOlwiMFwifSxcInJvbGVcIjpbXX0iLCJhdXRob3JpdGllcyI6WyJST0xFX1VTRVIiXSwiaWF0IjoxNzQ0MDk4OTU1LCJleHAiOjE3NDQyNzg5NTV9.mZI4XvU8zf9xsOJZJRMv2m7cSJrlcZjH436UyNys153DSjU2yi1JHzpM65VuaSID6j2BziguQGJdyAYryCdLgA";

const getAuthHeaders = (token) => ({
  'Authorization': 'Bearer ' + token,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
});

// Initialize crawl state object
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



// Main website download function
export const downloadWebsite = async (startUrl, outputPath, options = {}) => {
  // Setup configuration and directories
  const config = { ...DEFAULT_CONFIG, ...options, assetAuthHeaders: getAuthHeaders(token) };
  await fs.mkdir(outputPath, { recursive: true });

  // Initialize state
  const crawlState = initializeCrawlState(config, outputPath);

  try {
    // Prepare URL and directories
    const { baseOutputDir, startUrlLocal } = await prepareStartUrl({ startUrl, outputPath });

    // Add starting URL to pending list
    crawlState.pendingUrls.set(startUrl, { depth: 0, localPath: startUrlLocal });

    // Process all URLs
    await processPendingUrls({ crawlState, baseOutputDir });

    // Create manifest and finalize
    const result = await finalizeArchive({ startUrl, crawlState });

    // Log results
    logResults(result);

    return result;
  } catch (error) {
    console.error(`Failed to download website: ${error.message}`);
    throw error;
  }
};


export const getLocalVersion = async ({ urls, outputFolder }) => {
  try {
    const outputPath = path.join(process.cwd(), outputFolder);

    for (const url of urls) {
      console.log(`Starting download for ${url}`);
      await downloadWebsite(url, outputPath, {
        maxDepth: 2,
        sameDomainOnly: true
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
};


// URLs to process
const urls = [
  'https://www.iblib.com/user/html/topic/ENENT10021',
  'https://www.iblib.com/user/html/topic/ENENT10022',
  'https://www.iblib.com/user/html/topic/ENENT10023',
  'https://www.iblib.com/user/html/topic/ENENT10024',
  'https://www.iblib.com/user/html/topic/ENENT10025'
];


const outputFolder = 'output';
getLocalVersion({ urls, outputFolder })
  .then(() => {
    console.log('Download completed successfully.');
  })
  .catch((error) => {
    console.error('Error during download:', error);
  });
