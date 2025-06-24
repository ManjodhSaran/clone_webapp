import { Router } from 'express';
import { ArchiveController } from '../../controllers/ArchiveController.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/archive:
 *   post:
 *     summary: Archive educational content
 *     description: Downloads and archives educational content for offline access
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
 *               currYear:
 *                 type: string
 *                 description: Curriculum year
 *               subject:
 *                 type: string
 *                 description: Specific subject to archive (optional)
 *               token:
 *                 type: string
 *                 description: Authentication token (optional)
 *     responses:
 *       200:
 *         description: Archive process completed successfully
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Archive process failed
 */
router.post('/', authMiddleware, ArchiveController.archiveContent);

/**
 * @swagger
 * /api/archive/download/{filename}:
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
 *       500:
 *         description: Download failed
 */
router.get('/download/:filename', ArchiveController.downloadArchive);

export default router;