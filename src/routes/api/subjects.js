import { Router } from 'express';
import { SubjectController } from '../../controllers/SubjectController.js';
import { authMiddleware } from '../../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/subjects/courses:
 *   get:
 *     summary: Get available courses
 *     description: Retrieves a list of all available courses for the authenticated user
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/courses', authMiddleware, SubjectController.getCourses);

/**
 * @swagger
 * /api/subjects/years:
 *   get:
 *     summary: Get available academic years
 *     description: Retrieves a list of all available academic years
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Years retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/years', authMiddleware, SubjectController.getYears);

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     summary: Get subjects for curriculum and year
 *     description: Retrieves subjects available for a specific curriculum and year
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: curr
 *         required: true
 *         schema:
 *           type: string
 *         description: Curriculum identifier
 *       - in: query
 *         name: currYear
 *         required: true
 *         schema:
 *           type: string
 *         description: Curriculum year
 *     responses:
 *       200:
 *         description: Subjects retrieved successfully
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Authentication required
 */
router.get('/', authMiddleware, SubjectController.getSubjects);

/**
 * @swagger
 * /api/subjects/{id}/chapters:
 *   get:
 *     summary: Get chapters for a subject
 *     description: Retrieves all chapters and content for a specific subject
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject identifier
 *       - in: query
 *         name: curr
 *         required: true
 *         schema:
 *           type: string
 *         description: Curriculum identifier
 *       - in: query
 *         name: currYear
 *         required: true
 *         schema:
 *           type: string
 *         description: Curriculum year
 *       - in: query
 *         name: subject
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject name
 *     responses:
 *       200:
 *         description: Chapters retrieved successfully
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Subject not found
 */
router.get('/:id/chapters', authMiddleware, SubjectController.getChapters);

/**
 * @swagger
 * /api/subjects/offline/url:
 *   get:
 *     summary: Get offline download URL for subject
 *     description: Retrieves the download URL for offline access to a subject
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: curr
 *         required: true
 *         schema:
 *           type: string
 *         description: Curriculum identifier
 *       - in: query
 *         name: currYear
 *         required: true
 *         schema:
 *           type: string
 *         description: Curriculum year
 *       - in: query
 *         name: subject
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject name
 *     responses:
 *       200:
 *         description: Download URL retrieved successfully
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Subject not found
 */
router.get('/offline/url', authMiddleware, SubjectController.getOfflineSubject);

/**
 * @swagger
 * /api/subjects/offline/status:
 *   get:
 *     summary: Check if subject is available offline
 *     description: Checks the offline availability status of a subject
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: curr
 *         required: true
 *         schema:
 *           type: string
 *         description: Curriculum identifier
 *       - in: query
 *         name: currYear
 *         required: true
 *         schema:
 *           type: string
 *         description: Curriculum year
 *       - in: query
 *         name: subject
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject name
 *     responses:
 *       200:
 *         description: Offline status retrieved successfully
 *       401:
 *         description: Authentication required
 *   post:
 *     summary: Update subject offline status
 *     description: Updates the offline availability status of a subject
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [curr, currYear, subject]
 *             properties:
 *               curr:
 *                 type: string
 *                 description: Curriculum identifier
 *               currYear:
 *                 type: string
 *                 description: Curriculum year
 *               subject:
 *                 type: string
 *                 description: Subject name
 *     responses:
 *       200:
 *         description: Subject status updated successfully
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Authentication required
 */
router.get('/offline/status', authMiddleware, SubjectController.getOfflineSubjectStatus);
router.post('/offline/status', authMiddleware, SubjectController.updateOfflineSubjectStatus);

export default router;