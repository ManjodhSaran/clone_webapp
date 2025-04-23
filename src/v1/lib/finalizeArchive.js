import fs from 'fs/promises';
import path from 'path';
import { createSitemap } from './createSitemap.js';


export const finalizeArchive = async ({ crawlState, sitemap: sitemapObject }) => {
    const manifest = {
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

    const sitemap = await createSitemap({ outputPath: crawlState.outputPath, processedUrls: crawlState.processedUrls, sitemap: sitemapObject });

    return {
        outputPath: crawlState.outputPath,
        sitemap,
        stats: {
            ...crawlState.stats,
            uniqueAssets: crawlState.stats.totalAssets - crawlState.stats.duplicateAssets,
            processedUrls: Array.from(crawlState.processedUrls.keys())
        }
    };
};
