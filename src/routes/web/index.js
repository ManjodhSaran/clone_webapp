import { Router } from 'express';
import { AuthController } from '../../controllers/AuthController.js';
import { uiAuthMiddleware } from '../../middleware/auth.js';

const router = Router();

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
 */
router.get('/ui/login', AuthController.renderLoginPage);
router.post('/ui/login', AuthController.uiLogin);

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
router.get('/logout', AuthController.logout);

router.get('/dashboard', uiAuthMiddleware, (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard - IBLib',
    user: req.user || { 
      firstName: 'Demo', 
      lastName: 'User',
      userName: 'demo',
      userId: '123',
      loginType: 'student',
      idSchool: 'DEMO001',
      schoolName: 'Demo School',
      loginImage: '/images/default-avatar.png',
      curr: 'IB',
      currYear: 'Year 12'
    }
  });
});

router.get('/', (req, res) => {
  res.redirect('/ui/login');
});

export default router;