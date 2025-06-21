import router from './v1/routes/index.js';
import { specs, swaggerUi } from './config/swagger.js';

import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
dotenv.config();
// Import routes
import { router as authRoutes } from './routes/auth.js';
import { uiAuthMiddleware } from './routes/middlewares.js';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - Apply CORS early in the middleware chain
// For development, you might want to specify your frontend origin
const corsOptions = {
  origin: '*', // Change this to your production frontend domain
  // Common frontend dev ports
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Set up view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .info .title { color: #3b82f6 }
  `,
  customSiteTitle: "Educational Content API Documentation",
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    requestInterceptor: (req) => {
      // Add any default headers or modify requests here
      return req;
    }
  }
}));

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

// API Documentation redirect
app.get('/docs', (req, res) => {
  res.redirect('/api-docs');
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
  console.log(`API Documentation available at: http://localhost:${PORT}/api-docs`);
  console.log(`Dashboard available at: http://localhost:${PORT}/dashboard`);
});

export default app;