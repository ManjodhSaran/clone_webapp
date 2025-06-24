import { Router } from 'express';
import authRoutes from './auth.js';
import subjectRoutes from './subjects.js';
import archiveRoutes from './archive.js';
import studyRoutes from './study.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/subjects', subjectRoutes);
router.use('/archive', archiveRoutes);
router.use('/study', studyRoutes);

export default router;