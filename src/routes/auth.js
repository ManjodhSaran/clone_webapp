import express from 'express';
import { authMiddleware } from './middlewares.js';
import { SubjectController, UserController } from './controller.js';
import { archiverWeb } from '../v1/controllers/archive.js';

// Create router for API endpoints
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and session management
 */

/**
 * @swagger
 * tags:
 *   name: Subjects
 *   description: Subject and curriculum management
 */

/**
 * @swagger
 * tags:
 *   name: Archive
 *   description: Content archiving and offline access
 */

/**
 * @swagger
 * /api/courses:
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Course data retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/api/courses', authMiddleware, SubjectController.getCourses);

/**
 * @swagger
 * /api/years:
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Course data retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       year:
 *                         type: string
 *                       name:
 *                         type: string
 *       401:
 *         description: Authentication required
 */
router.get('/api/years', authMiddleware, SubjectController.getYears);

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
 *         example: "IB"
 *       - in: query
 *         name: currYear
 *         required: true
 *         schema:
 *           type: string
 *         description: Curriculum year
 *         example: "Year 12"
 *     responses:
 *       200:
 *         description: Subjects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subject'
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Authentication required
 */
router.get('/api/subjects', authMiddleware, SubjectController.getSubjects);

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subjectData:
 *                   type: object
 *                   description: Subject chapters and content
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Subject not found
 */
router.get('/api/subjects/:id/chapters', authMiddleware, SubjectController.getChapters);

/**
 * @swagger
 * /api/get_offline_url:
 *   get:
 *     summary: Get offline download URL for subject
 *     description: Retrieves the download URL for offline access to a subject
 *     tags: [Archive]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 url:
 *                   type: string
 *                   description: Download URL for offline content
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Subject not found
 */
router.get('/api/get_offline_url', authMiddleware, SubjectController.getOfflineSubject);

/**
 * @swagger
 * /api/is_subject_offline:
 *   get:
 *     summary: Check if subject is available offline
 *     description: Checks the offline availability status of a subject
 *     tags: [Archive]
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subjectStatus:
 *                   type: object
 *                   properties:
 *                     isOffline:
 *                       type: boolean
 *                     downloadDate:
 *                       type: string
 *                       format: date-time
 *                     size:
 *                       type: number
 *       401:
 *         description: Authentication required
 */
router.get('/api/is_subject_offline', authMiddleware, SubjectController.getOfflineSubjectStatus);

/**
 * @swagger
 * /api/update_subject_status:
 *   post:
 *     summary: Update subject offline status
 *     description: Updates the offline availability status of a subject
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 subjectStatus:
 *                   type: object
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Authentication required
 */
router.post('/api/update_subject_status', authMiddleware, SubjectController.updateOfflineSubjectStatus);

/**
 * @swagger
 * /api/login:
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       503:
 *         description: Login service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/api/login', UserController.login);

/**
 * @swagger
 * /ui/login:
 *   get:
 *     summary: Login page
 *     description: Renders the login page for web interface
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Login page rendered successfully
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       302:
 *         description: Redirect to dashboard if already logged in
 *   post:
 *     summary: User login (Web Form)
 *     description: Handles form-based login for web interface
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [user, password]
 *             properties:
 *               user:
 *                 type: string
 *                 description: Username
 *               password:
 *                 type: string
 *                 description: Password
 *               remember_me:
 *                 type: boolean
 *                 description: Remember login session
 *     responses:
 *       302:
 *         description: Redirect to dashboard on success or back to login on failure
 *       200:
 *         description: Login page with error message
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
router.get('/ui/login', UserController.renderLoginPage);
router.post('/ui/login', UserController.uiLogin);

/**
 * @swagger
 * /logout:
 *   get:
 *     summary: User logout
 *     description: Logs out the user and clears authentication cookies
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to login page
 */
router.get('/logout', UserController.logout);

/**
 * @swagger
 * /api/archive:
 *   post:
 *     summary: Archive subject content
 *     description: Downloads and archives subject content for offline access
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
 *                 description: Specific subject to archive (optional, archives all if not provided)
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
 *                 details:
 *                   type: string
 *                 subjects:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subject'
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Archive process failed
 */
router.use("/api/archive", authMiddleware, archiverWeb);

// Export the router and utility functions
export { router };