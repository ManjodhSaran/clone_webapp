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


// Middlewares
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
    maxAge: 3600000 // 1 hour
  }
}));


// Set up CORS
// allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// console all requests

app.use((req, res, next) => {
  console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);
  next();
}
);

app.use('/v1/api', router)


// Use routes
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


// // home page
// app.get('/', (req, res) => {
//   res.send('Offline API is running');
// });

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;