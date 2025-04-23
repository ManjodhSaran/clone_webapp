import { prepareStartUrl } from './prepareStartUrl.js';
import { processPendingUrls } from './processPendingUrls.js';


export const downloadWebsite = async ({ startUrl, crawlState, outputPath, }) => {

    try {
        const { baseOutputDir, startUrlLocal } = await prepareStartUrl({ startUrl, outputPath });
        crawlState.pendingUrls.set(startUrl, { depth: 0, localPath: startUrlLocal });
        await processPendingUrls({ crawlState, baseOutputDir });

    } catch (error) {
        console.error(`Failed to download website: ${error.message}`);
        throw error;
    }
};
