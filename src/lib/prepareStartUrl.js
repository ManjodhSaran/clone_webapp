import path from 'path';
import { URL } from 'url';
import fs from 'fs/promises';
import sanitize from 'sanitize-filename';

export const prepareStartUrl = async ({ startUrl, outputPath }) => {
    const startUrlObj = new URL(startUrl);
    const baseDomain = startUrlObj.hostname;
    const baseOutputDir = path.join(outputPath, sanitize(baseDomain));

    await fs.mkdir(baseOutputDir, { recursive: true });

    // Handle URL paths
    let startPath = startUrlObj.pathname;
    if (startPath === '/' || startPath === '') {
        startPath = '/index.html';
    } else if (!path.extname(startPath)) {
        startPath = `${startPath}/index.html`.replace(/\/+/g, '/');
    }

    const startUrlLocal = path.join(baseOutputDir, startPath.replace(/^\//, ''));

    return { startUrlObj, baseOutputDir, startUrlLocal };
};