import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController.js';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login (API)
 *     description: Authenticates a user and returns user data with access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: Access token for API authentication
 *       400:
 *         description: Missing username or password
 *       401:
 *         description: Invalid credentials
 *       503:
 *         description: Login service unavailable
 */
router.post('/login', AuthController.login);

export default router;