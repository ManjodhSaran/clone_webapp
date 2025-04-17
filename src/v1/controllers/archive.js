import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getLocalVersion } from '../lib/archiver.js';
import createZipArchive from '../utils/zip.util.js';
import { getUrlsFromRequest } from '../lib/getUrls.js';

const token = "eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiJpYmxpYkpXVCIsInN1YiI6IntcImxvZ2luTmFtZVwiOlwibmVoYS5hcnJvd1wiLFwidXNlclwiOntcImlkXCI6XCIxMDNcIixcImxvZ2luTmFtZVwiOlwibmVoYS5hcnJvd1wiLFwiaWRTdHVkZW50XCI6XCJcIixcImZpcnN0TmFtZVwiOlwiTmVoYVwiLFwibGFzdE5hbWVcIjpcIkFycm93XCIsXCJmYXRoZXJOYW1lXCI6XCJcIixcInBob25lTnVtYmVyXCI6XCI2Mzk1OTUyMjcxXCIsXCJlbWFpbEFkZHJlc3NcIjpcImlibGliLmluZm9AZ21haWwuY29tXCIsXCJiaXJ0aERhdGVcIjpcIjIwMDAtMDEtMDFcIixcImdlbmRlclwiOlwiRkVNQUxFXCIsXCJ1c2VySW1hZ2VcIjpcImh0dHBzOi8vZ3JhZGVwbHVzLnMzLmFwLXNvdXRoLTEuYW1hem9uYXdzLmNvbS91c2Vycy9hc3NldHMvaW1nL3VzZXJzL2Nyb3BwZWQ5MjE0MzgxMjk5MjI3Nzg1ODg1LmpwZ1wiLFwidXNlclR5cGVcIjpcIkNMSUVOVF9BRE1JTlwiLFwiaWRTY2hvb2xcIjpcIjQ4XCIsXCJzY2hvb2xOYW1lXCI6XCJBcnJvdyBJbnRlciBDb2xsZWdlXCIsXCJjdXJyXCI6XCJVUC1CT0FSRFwiLFwiY3VyclllYXJcIjpcIkNMQVNTLVZJXCIsXCJ5ZWFyR3JvdXBcIjpcIlwiLFwiaWRBZGRyZXNzXCI6XCIzNTlcIixcImxvY2FsQWRkcmVzc1wiOlwiVUdGIDAzLCBUcmluaXR5IFNxdWFyZVwiLFwiaXNMb2NrZWRcIjpcIjBcIn0sXCJyb2xlXCI6W119IiwiYXV0aG9yaXRpZXMiOlsiUk9MRV9VU0VSIl0sImlhdCI6MTc0NDg4ODk0OCwiZXhwIjoxNzQ0ODk3OTQ4fQ._OKMHbIk0QS-JOjMPKBIlz4lD-_JpxO-V2z-ogpwaBO-aWfZ48_vJEJHUNvYKBcCsno88iXKrg-T-O_Qn_sjxQ"

export const archiverWeb = async (req, res) => {

    const { name, payload } = req.body;

    if (!name || !payload) {
        return res.status(400).json({
            error: 'Name and payload are required',
            details: 'Please provide a name and payload in the request body'
        });
    }


    try {
        const links = await getUrlsFromRequest({
            name,
            token,
            payload
        })
        console.log('links', JSON.stringify(links, null, 2));
        const urls = links.urls;
        const sitemap = links.sitemap;

        if (!urls || urls.length === 0) {
            return res.status(400).json({
                error: 'URLs are required',
                details: 'Please provide at least one URL to download'
            });
        }

        const startTime = Date.now();
        // const _path = `results/out-${startTime}`;
        const _path = `results/${name}`;
        const outputPath = path.join(process.cwd(), _path);
        await getLocalVersion({ urls, outputPath, sitemap });

        const { fileName, buffer } = await createZipArchive(outputPath);

        fs.mkdir('downloads', { recursive: true });
        const zipPath = path.join(process.cwd(), 'downloads', fileName);
        fsSync.writeFileSync(zipPath, buffer);

        const endTime = Date.now();

        return res.status(200).json({
            success: true,
            status: 200,

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