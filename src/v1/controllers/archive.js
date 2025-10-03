import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { getLocalVersion } from '../lib/archiver.js';
import createZipArchive from '../utils/zip.util.js';
import { getSubjectsFromRequest, getUrlsFromRequest, uploadToServer } from '../lib/getUrls.js';

/**
 * @swagger
 * /v1/api/archive:
 *   post:
 *     summary: Archive educational content
 *     description: Downloads and archives educational content for offline access. Can archive a specific subject or all subjects for a curriculum and year.
 *     tags: [Archive]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [curr, currYear]
 *             properties:
 *               curr:
 *                 type: string
 *                 description: Curriculum identifier
 *                 example: "IB"
 *               currYear:
 *                 type: string
 *                 description: Curriculum year
 *                 example: "Year 12"
 *               subject:
 *                 type: string
 *                 description: Specific subject to archive (optional, archives all if not provided)
 *                 example: "Biology"
 *               token:
 *                 type: string
 *                 description: Authentication token (optional, uses request token if not provided)
 *     responses:
 *       200:
 *         description: Archive process completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Download completed"
 *                 details:
 *                   type: string
 *                   example: "All subjects have been downloaded and uploaded successfully."
 *                 subjects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subject'
 *                 subject:
 *                   $ref: '#/components/schemas/Subject'
 *                   description: Only present when archiving a single subject
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Archive process failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
export const archiverWeb = async (req, res) => {
    try {
        const { curr, currYear, subject } = req.body;
        const token = req?.body?.token || req.token;

        if (subject) {
            console.log('subject', subject);

            const curriculum = curr;
            const year = currYear;

            let name = `${curriculum}_${year}_${subject}`;
            // replace space with black
            name = name.replaceAll(" ", "");

            const payload = { curriculum, year, subject };
            console.log(`Downloading ${name}...`);
            const chapters = await getChapters({ name, payload, token });
            console.log(`Uploading ${name}...`);
            await uploadToServer({ name, token });

            if (fsSync.existsSync('results')) {
                await fsSync.promises.rm('results', { recursive: true, force: true });
            }
            if (fsSync.existsSync('downloads')) {
                await fsSync.promises.rm('downloads', { recursive: true, force: true });
            }

            return res.status(200).json({
                message: 'Download completed',
                details: `Subject ${subject} has been downloaded and uploaded successfully.`,
                subject: { curriculum, year, subject }
            });
        }

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

/**
 * @swagger
 * /v1/api/archive/download/{filename}:
 *   get:
 *     summary: Download archived content
 *     description: Downloads a previously archived content file
 *     tags: [Archive]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the archived file to download
 *         example: "IB_Year12_Biology.zip"
 *     responses:
 *       200:
 *         description: File download started
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Download failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
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