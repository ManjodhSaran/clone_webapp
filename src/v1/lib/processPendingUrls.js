import { processUrl } from "./processUrl.js";


export const processPendingUrls = async ({ crawlState, baseOutputDir }) => {
    while (
        crawlState.pendingUrls.size > 0 &&
        crawlState.stats.totalPages < crawlState.config.maxTotalPages
    ) {
        const batchPromises = [];

        for (const [url, { depth, localPath }] of crawlState.pendingUrls.entries()) {
            crawlState.pendingUrls.delete(url);
            if (crawlState.processedUrls.has(url)) continue;

            crawlState.processedUrls.set(url, localPath);
            crawlState.urlToLocalMap.set(url, localPath);

            batchPromises.push(
                crawlState.queue.add(() =>
                    processUrl({
                        url,
                        depth,
                        localPath,
                        crawlState,
                        baseOutputDir
                    })
                )
            );

            if (crawlState.stats.totalPages >= crawlState.config.maxTotalPages) break;
        }

        await Promise.all(batchPromises);
    }
};
