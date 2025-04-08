import path from 'path';
import { URL } from 'url';
import fs from 'fs/promises';
import { createRelativePath } from '../utils/path.util.js';

export const processCssFile = async ({ cssFilePath, baseUrl, crawlState }) => {
    let { processedUrls, pendingUrls, domainCounters, queue, assetHashes, urlToLocalMap, stats: { totalPages, failedPages, totalAssets, duplicateAssets, }, config } = crawlState
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
                    const promise = processAsset({ assetUrl: fullUrl, baseUrl, crawlState }).then(assetInfo => {
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
                const promise = processAsset({ assetUrl: fullUrl, baseUrl, crawlState }).then(assetInfo => {
                    if (assetInfo) {
                        // Create a relative path from the CSS file to the imported CSS
                        const relativePath = createRelativePath(cssFilePath, assetInfo.path);

                        // Replace the import in the CSS
                        modifiedCss = modifiedCss.replace(
                            new RegExp(`@import\\s+['"]${importUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
                            `@import "${relativePath}"`
                        );

                        // Also process the imported CSS
                        return processCssFile({ cssFilePath: assetInfo.path, baseUrlfullUrl, crawlState });
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