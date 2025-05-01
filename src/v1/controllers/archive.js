import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getLocalVersion } from '../lib/archiver.js';
import createZipArchive from '../utils/zip.util.js';
import { getSubjectsFromRequest, getUrlsFromRequest, uploadToServer } from '../lib/getUrls.js';


const getChapters = async ({ name, payload, token }) => {

    try {
        const links = await getUrlsFromRequest({ name, token, payload });

        const urls = links.urls;
        const sitemap = links.sitemap;

        if (!urls || urls.length === 0) {
            return res.status(400).json({
                error: 'URLs are required',
                details: 'Please provide at least one URL to download'
            });
        }

        const startTime = Date.now();

        const _path = `results/${name}`;
        const outputPath = path.join(process.cwd(), _path);
        await getLocalVersion({ urls, outputPath, sitemap, token });

        const { fileName, buffer } = await createZipArchive(outputPath);

        await fs.mkdir('downloads', { recursive: true });
        const zipPath = path.join(process.cwd(), 'downloads', fileName);
        fsSync.writeFileSync(zipPath, buffer);

        const endTime = Date.now();

        console.log({
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

export const archiverWeb = async (req, res) => {
    try {
        const { curr, currYear, token } = req.body;

        const subjects = await getSubjectsFromRequest({ token, curr, currYear });

        // Replace forEach with Promise.all to wait for all operations to complete
        await Promise.all(subjects.map(async (item) => {
            const { curriculum, year, subject } = item;

            let name = `${curriculum}_${year}_${subject}`;
            // replace space with black
            name = name.replaceAll(" ", "");

            const payload = { curriculum, year, subject };
            console.log(`Downloading ${name}...`);
            const chapters = await getChapters({ name, payload, token });
            console.log(`Uploading ${name}...`);
            await uploadToServer({ name, token });

        }));


        // clear the results folder and downloads folder
        if (fsSync.existsSync('results')) {
            await fsSync.promises.rm('results', { recursive: true, force: true });
        }
        if (fsSync.existsSync('downloads')) {
            await fsSync.promises.rm('downloads', { recursive: true, force: true });
        }

        // This will only execute after all downloads and uploads are complete
        res.status(200).json({
            message: 'Download completed',
            details: 'All subjects have been downloaded and uploaded successfully.',
            subjects
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            message: 'An error occurred',
            error: error.message
        });
    }
};

export const downloadArchive = async (req, res) => {

    const { filename } = req.params;

    const filePath = path.join(process.cwd(), 'downloads', filename);

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