import { Router } from "express";
import { generateContentFromWord } from "../controllers/study.js";
import { generateHtmlContentFromWord } from "../controllers/study2.js";
import { generateProgressiveHtmlContent, getSessionImages } from "../controllers/study3.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Educational Content
 *   description: API endpoints for generating educational content
 */

/**
 * @swagger
 * /v1/api/study/generate/{word}:
 *   get:
 *     summary: Generate educational content for a word/concept (JSON)
 *     description: Creates structured educational content in JSON format for a given word or concept
 *     tags: [Educational Content]
 *     parameters:
 *       - in: path
 *         name: word
 *         required: true
 *         schema:
 *           type: string
 *         description: The word or concept to generate educational content for
 *         example: photosynthesis
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *           enum: [claude-3-haiku-20240307, claude-3-sonnet-20240229, claude-3-opus-20240229]
 *           default: claude-3-haiku-20240307
 *         description: AI model to use for content generation
 *     responses:
 *       200:
 *         description: Educational content generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EducationalContent'
 *       400:
 *         description: Invalid model or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Server error or API key not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get("/generate/:word", generateContentFromWord);

/**
 * @swagger
 * /v1/api/study/generate/html/{word}:
 *   get:
 *     summary: Generate educational content for a word/concept (HTML - Legacy)
 *     description: Creates a complete HTML page with educational content (legacy version without progressive loading)
 *     tags: [Educational Content]
 *     parameters:
 *       - in: path
 *         name: word
 *         required: true
 *         schema:
 *           type: string
 *         description: The word or concept to generate educational content for
 *         example: photosynthesis
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *           enum: [claude-3-haiku-20240307, claude-3-sonnet-20240229, claude-3-opus-20240229]
 *           default: claude-3-haiku-20240307
 *         description: AI model to use for content generation
 *     responses:
 *       200:
 *         description: Educational HTML content generated successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Complete HTML page with educational content
 *       400:
 *         description: Invalid model or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       500:
 *         description: Server error or API key not configured
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: Error page HTML
 */
router.get("/generate/html/:word", generateHtmlContentFromWord);

router.get("/generate/html/:word", generateProgressiveHtmlContent);
router.get("/images/:sessionId", getSessionImages);

export default router;