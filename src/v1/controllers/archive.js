import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getLocalVersion } from '../lib/archiver.js';
import createZipArchive from '../utils/zip.util.js';

export const archiverWeb = async (req, res) => {
    try {
        const { urls } = req.body;
        if (!urls || urls.length === 0) {
            return res.status(400).json({
                error: 'URLs are required',
                details: 'Please provide at least one URL to download'
            });
        }

        const startTime = Date.now();
        // const _path = `results/out-${startTime}`;
        const _path = `results/out`;
        const outputPath = path.join(process.cwd(), _path);
        await getLocalVersion({ urls, outputPath });

        const { fileName, buffer } = await createZipArchive(outputPath);

        fs.mkdir('downloads', { recursive: true });
        const zipPath = path.join(process.cwd(), 'downloads', fileName);
        fsSync.writeFileSync(zipPath, buffer);

        const endTime = Date.now();

        return res.status(200).json({
            message: 'Download completed successfully',
            fileName,
            duration: `${(endTime - startTime) / 1000} seconds`,
            downloadUrl: `http://localhost:3000/v1/api/archive/download/${fileName}`
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({
            error: 'Download failed',
            details: error.message
        });
    }
};


export const downloadArchive = async (req, res) => {

    const { filename } = req.params;

    const filePath = path.join(process.cwd(), 'downloads', filename);
    console.log('filePath', filePath)

    if (fsSync.existsSync(filePath)) {
        res.download(filePath, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({
                    error: 'Download failed',
                    details: err.message
                });
            }
        });
    }
    else {
        res.status(404).json({
            error: 'File not found',
            details: `The file ${filename} does not exist`
        });
    }

}