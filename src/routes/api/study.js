import { Router } from 'express';
import { StudyController } from '../../controllers/StudyController.js';

const router = Router();

/**
 * @swagger
 * /api/study/generate/{word}:
 *   get:
 *     summary: Generate educational content for a word/concept
 *     description: Creates structured educational content for a given word or concept
 *     tags: [Educational Content]
 *     parameters:
 *       - in: path
 *         name: word
 *         required: true
 *         schema:
 *           type: string
 *         description: The word or concept to generate educational content for
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
 *       500:
 *         description: Server error or API key not configured
 */
router.get('/generate/:word', StudyController.generateContentFromWord);

export default router;