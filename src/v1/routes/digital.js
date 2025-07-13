import { Router } from "express";

import { upload } from "../middleware/upload.js";
import { digitizePdf } from '../controllers/digital.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Digitilize PDF
 *   description: API endpoints for digitizing PDFs
 */

/**
 * @swagger
 * /v1/api/digital/pdf:
 *   post:
 *     summary: Digitize a PDF document
 *     description: Processes and digitizes a PDF document
 *     tags: [Digitilize PDF]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF file to digitize
 *             required:
 *               - file
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL of the PDF to digitize
 *               options:
 *                 type: object
 *                 description: Additional processing options
 *     responses:
 *       200:
 *         description: PDF digitized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Digitized content
 *                 message:
 *                   type: string
 *                   example: "PDF digitized successfully"
 *       400:
 *         description: Bad request - Invalid file or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid file format or missing file"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to process PDF"
 */

router.post("/pdf", upload.single('file'), digitizePdf);

export default router;