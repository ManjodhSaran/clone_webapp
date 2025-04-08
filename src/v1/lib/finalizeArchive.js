import fs from 'fs/promises';
import path from 'path';
import createZipArchive from '../utils/zip.util.js';
import { createSitemap } from './createSitemap.js';


export const finalizeArchive = async ({ startUrl, crawlState }) => {
    const manifest = {
        originalUrl: startUrl,
        dateArchived: new Date().toISOString(),
        stats: {
            ...crawlState.stats,
            uniqueAssets: crawlState.stats.totalAssets - crawlState.stats.duplicateAssets
        },
        domains: Object.fromEntries(crawlState.domainCounters),
        config: crawlState.config
    };

    await fs.writeFile(
        path.join(crawlState.outputPath, 'archive-manifest.json'),
        JSON.stringify(manifest, null, 2)
    );

    const sitemap = await createSitemap({ outputPath: crawlState.outputPath, processedUrls: crawlState.processedUrls });
    // const {
    //     zipFilePath,
    //     downloadLink
    // } = await createZipArchive(crawlState.outputPath);

    return {
        outputPath: crawlState.outputPath,
        // zipFilePath,
        // downloadLink,
        sitemap,
        stats: {
            ...crawlState.stats,
            uniqueAssets: crawlState.stats.totalAssets - crawlState.stats.duplicateAssets,
            processedUrls: Array.from(crawlState.processedUrls.keys())
        }
    };
};
