import express from 'express';
import { authMiddleware } from './middlewares.js';
import { SubjectController, UserController } from './controller.js';
import { archiverWeb } from '../v1/controllers/archive.js';

// Create router for API endpoints
const router = express.Router();

// Subject routes
router.get('/api/courses', authMiddleware, SubjectController.getCourses);
router.get('/api/years', authMiddleware, SubjectController.getYears);
router.get('/api/subjects', authMiddleware, SubjectController.getSubjects);
router.get('/api/subjects/:id/chapters', authMiddleware, SubjectController.getChapters);
router.get('/api/get_offline_url', authMiddleware, SubjectController.getOfflineSubject);
router.get('/api/is_subject_offline', authMiddleware, SubjectController.getOfflineSubjectStatus);
router.post('/api/update_subject_status', authMiddleware, SubjectController.updateOfflineSubjectStatus);

// Authentication routes
router.get('/ui/login', UserController.renderLoginPage);
router.post('/api/login', UserController.login);
router.post('/ui/login', UserController.uiLogin);
router.get('/logout', UserController.logout);
router.use("/api/archive", authMiddleware, archiverWeb);

// Export the router and utility functions
export { router };