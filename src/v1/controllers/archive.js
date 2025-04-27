import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getLocalVersion } from '../lib/archiver.js';
import createZipArchive from '../utils/zip.util.js';
import { getSubjectsFromRequest, getUrlsFromRequest } from '../lib/getUrls.js';

const token = "eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJpYmxpYkpXVCIsInN1YiI6IntcImxvZ2luTmFtZVwiOlwibmVoYS5hcnJvd1wiLFwidXNlclwiOntcImlkXCI6XCIxMDNcIixcImxvZ2luTmFtZVwiOlwibmVoYS5hcnJvd1wiLFwiaWRTdHVkZW50XCI6XCJcIixcImZpcnN0TmFtZVwiOlwiTmVoYVwiLFwibGFzdE5hbWVcIjpcIkFycm93XCIsXCJmYXRoZXJOYW1lXCI6XCJcIixcInBob25lTnVtYmVyXCI6XCI2Mzk1OTUyMjcxXCIsXCJlbWFpbEFkZHJlc3NcIjpcImlibGliLmluZm9AZ21haWwuY29tXCIsXCJiaXJ0aERhdGVcIjpcIjIwMDAtMDEtMDFcIixcImdlbmRlclwiOlwiRkVNQUxFXCIsXCJ1c2VySW1hZ2VcIjpcImh0dHBzOi8vZ3JhZGVwbHVzLnMzLmFwLXNvdXRoLTEuYW1hem9uYXdzLmNvbS91c2Vycy9hc3NldHMvaW1nL3VzZXJzL2Nyb3BwZWQ5MjE0MzgxMjk5MjI3Nzg1ODg1LmpwZ1wiLFwidXNlclR5cGVcIjpcIkNMSUVOVF9BRE1JTlwiLFwiaWRTY2hvb2xcIjpcIjQ4XCIsXCJzY2hvb2xOYW1lXCI6XCJBcnJvdyBJbnRlciBDb2xsZWdlXCIsXCJjdXJyXCI6XCJDQlNFXCIsXCJjdXJyWWVhclwiOlwiQ0xBU1MtWElJXCIsXCJ5ZWFyR3JvdXBcIjpcIlwiLFwiaWRBZGRyZXNzXCI6XCIzNTlcIixcImxvY2FsQWRkcmVzc1wiOlwiVUdGIDAzLCBUcmluaXR5IFNxdWFyZVwiLFwiaXNMb2NrZWRcIjpcIjBcIn0sXCJyb2xlXCI6W119IiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9VU0VSIl0sImlhdCI6MTc0NTcyMzc5OCwiZXhwIjoxNzQ1NzMyNzk4fQ.LIdTJ7qhS0EH6XoIwHCTaJbpiGvNICpXNlsCxvXa9s40n9TPr_c2Lwu3QYl-N9BDDTFXZTV1cs203XIIwJhezg"

const getChapters = async ({ name, payload, token }) => {

    try {
        const links = await getUrlsFromRequest({
            name,
            token,
            payload
        })

        const urls = links.urls
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

        fs.mkdir('downloads', { recursive: true });
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
        const { curr, currYear } = req.body;

        const subjects = await getSubjectsFromRequest({ token, curr, currYear });
        await subjects.forEach(async (item) => {
            const { curriculum, year, subject } = item;

            const name = `${curriculum}-${year}-${subject}`;
            const payload = { curriculum, year, subject }
            const chapters = await getChapters({ name, payload, token });
        })

        res.status(200).json({
            message: 'Download started',
            details: 'The download process has started. You will receive a notification once it is completed.',
            subjects
        });

    } catch (error) {
        console.error("Error:", error);
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