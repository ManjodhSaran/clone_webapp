import router from './v1/routes/index.js';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';

// Import routes
import { router as authRoutes } from './routes/auth.js';
import { uiAuthMiddleware } from './routes/middlewares.js';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// CORS configuration - Apply CORS early in the middleware chain
// For development, you might want to specify your frontend origin
const corsOptions = {
  origin: 'https://content.iblib.com', // Change this to your production frontend domain
  // Common frontend dev ports
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // This is important if you're using cookies/sessions
};

app.use(cors(corsOptions));

// Logging middleware
app.use((req, res, next) => {
  console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);
  next();
});

// Other middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'iblib-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000, // 1 hour
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Helps with CORS issues for cookies
  }
}));

// API routes
app.use('/v1/api', router);

// Auth routes
app.use('/', authRoutes);

// Dashboard route (protected)
app.get('/dashboard', uiAuthMiddleware, (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard - IBLib',
    user: req.user
  });
});

// Default route
app.get('/', (req, res) => {
  res.redirect('/ui/login');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 middleware
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;