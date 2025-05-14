import axios from 'axios';
import express from 'express';
import cookieParser from 'cookie-parser';

// Create router for API endpoints
const router = express.Router();

// API endpoints
const API_BASE = 'https://www.iblib.com/api';
const API_ENDPOINTS = {
    login: `${API_BASE}/login`,
    subjectOfflineFile: `${API_BASE}/content/offline/subject`,
    subjectOfflineStatus: `${API_BASE}/content/offline/subject/status`,
    subjectOfflineStatusUpdate: `${API_BASE}/content/offline/subject/status?isOffline=1`
};

// Simple in-memory cache for user data
const userCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000 // 1 hour
};

/**
 * Helper function to get user from token
 * @param {string} token - Auth token
 * @returns {object|null} User data or null if not found
 */
const getUserFromToken = (token) => {
    if (!token) return null;

    for (const [userId, data] of userCache.entries()) {
        if (data.userData.access_token === token) {
            // Check if cache is expired
            if (Date.now() - data.timestamp > CACHE_TTL) {
                userCache.delete(userId);
                return null;
            }
            return data.userData;
        }
    }
    return null;
};

/**
 * Helper function to handle common error responses
 * @param {Error} error - Error object
 * @param {Response} res - Express response object
 */
const handleApiError = (error, res) => {
    console.error("API Error:", error);

    if (error.response) {
        // The server responded with a status code outside of 2xx
        return res.status(error.response.status).json({
            message: 'Request failed',
            error: error.response.data?.message || 'Server returned an error'
        });
    } else if (error.request) {
        // No response received
        return res.status(503).json({
            message: 'Service unavailable',
            error: 'No response from server'
        });
    } else {
        // Other errors
        return res.status(500).json({
            message: 'An error occurred',
            error: error.message
        });
    }
};

/**
 * Middleware to verify token and attach user data to request
 */
export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
        console.log('token', token)
        const userData = getUserFromToken(token);

        if (!userData) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        // Attach user data to request
        req.user = userData;
        next();
    } catch (error) {
        console.error("Auth Error:", error);
        res.status(500).json({
            message: 'Authentication error',
            error: error.message
        });
    }
};

/**
 * UI middleware for checking authentication
 */
export const uiAuthMiddleware = (req, res, next) => {
    const token = req.cookies?.auth_token;
    const userData = getUserFromToken(token);

    if (!userData) {
        return res.redirect('/ui/login?error=Session+expired.+Please+login+again.');
    }

    // Attach user data to request
    req.user = userData;
    next();
};

/**
 * Validate subject query parameters
 */
const validateSubjectParams = (params) => {
    const { curr, currYear, subject } = params;
    return curr && currYear && subject;
};

// Subject API endpoints
router.get('/api/offline/subject', authMiddleware, async (req, res) => {
    if (!validateSubjectParams(req.query)) {
        return res.status(400).json({
            message: 'Curriculum, curriculum year, and subject are required'
        });
    }

    try {
        const { curr, currYear, subject } = req.query;
        const payload = { curr, currYear, subject };
        console.log('payload', payload)

        const response = await axios.get(API_ENDPOINTS.subjectOfflineFile, payload, {
            headers: {
                Authorization: `${req.user.access_token}`
            }
        });

        const subjectData = response.data;
        if (!subjectData) {
            return res.status(404).json({
                message: 'Subject data not found'
            });
        }

        res.status(200).json({
            message: 'Subject data retrieved successfully',
            subjectData
        });
    } catch (error) {
        handleApiError(error, res);
    }
});

router.get('/api/offline/subject/status', authMiddleware, async (req, res) => {
    if (!validateSubjectParams(req.query)) {
        return res.status(400).json({
            message: 'Curriculum, curriculum year, and subject are required'
        });
    }

    try {
        const { curr, currYear, subject } = req.query;
        const payload = { curr, currYear, subject };
        console.log('payload', payload)
        console.log('req.user.access_token', req.user.access_token)
        const response = await axios.get(API_ENDPOINTS.subjectOfflineStatus, payload, {
            headers: {
                Authorization: `${req.user.access_token}`
            }
        });
        console.log(' response.data', JSON.stringify(response.data, null, 2));
        const subjectStatus = response.data;
        if (!subjectStatus) {
            return res.status(404).json({
                message: 'Subject status not found'
            });
        }

        res.status(200).json({
            message: 'Subject status retrieved successfully',
            subjectStatus
        });
    } catch (error) {
        handleApiError(error, res);
    }
});

router.post('/api/offline/subject/status', authMiddleware, async (req, res) => {
    if (!validateSubjectParams(req.body)) {
        return res.status(400).json({
            message: 'Curriculum, curriculum year, and subject are required'
        });
    }

    try {
        const { curr, currYear, subject } = req.body;
        const payload = { curr, currYear, subject };

        const response = await axios.post(API_ENDPOINTS.subjectOfflineStatusUpdate, payload, {
            headers: {
                Authorization: `${req.user.access_token}`
            }
        });

        const subjectStatus = response.data;
        if (!subjectStatus) {
            return res.status(404).json({
                message: 'Subject status not found'
            });
        }

        res.status(200).json({
            message: 'Subject status updated successfully',
            subjectStatus
        });
    } catch (error) {
        handleApiError(error, res);
    }
});

// Authentication endpoints
router.get('/ui/login', (req, res) => {
    const token = req.cookies?.auth_token;
    const userData = getUserFromToken(token);

    if (userData) {
        return res.redirect('/dashboard');
    }

    res.render('login', {
        title: 'Login - IBLib',
        error: req.query.error || null
    });
});

router.post('/api/login', async (req, res) => {
    const { user, password } = req.body;

    if (!user || !password) {
        return res.status(400).json({
            message: 'Username and password are required'
        });
    }

    try {
        const loginPayload = {
            user,
            password,
            fcmId: "",
            androidVersion: "9",
            androidVersionCode: "28",
            appVersion: "1.0",
            appVersionCode: "1"
        };

        const response = await axios.post(API_ENDPOINTS.login, loginPayload);
        const userData = response.data;

        if (!userData || !userData.access_token) {
            return res.status(401).json({
                message: 'Invalid credentials'
            });
        }

        // Store user data in cache
        userCache.set(userData.userId, {
            userData,
            timestamp: Date.now()
        });

        // Set auth cookie
        res.cookie('auth_token', userData.access_token, COOKIE_OPTIONS);

        // Return success response with filtered user data
        res.status(200).json({
            message: 'Login successful',
            user: {
                userId: userData.userId,
                userName: userData.userName,
                firstName: userData.firstName,
                lastName: userData.lastName,
                loginType: userData.loginType,
                idSchool: userData.idSchool,
                schoolName: userData.schoolName,
                loginImage: userData.loginImage,
                curr: userData.curr,
                currYear: userData.currYear
            },
            token: userData.access_token
        });
    } catch (error) {
        handleApiError(error, res);
    }
});

router.post('/ui/login', async (req, res) => {
    const { user, password } = req.body;

    if (!user || !password) {
        return res.render('login', {
            title: 'Login - IBLib',
            error: 'Username and password are required'
        });
    }

    try {
        const loginPayload = {
            user,
            password,
            fcmId: "",
            androidVersion: "9",
            androidVersionCode: "28",
            appVersion: "1.0",
            appVersionCode: "1"
        };

        const response = await axios.post(API_ENDPOINTS.login, loginPayload);
        const userData = response.data;

        // Store user data in cache
        userCache.set(userData.userId, {
            userData,
            timestamp: Date.now()
        });

        // Set auth cookie
        res.cookie('auth_token', userData.access_token, COOKIE_OPTIONS);

        // Redirect to dashboard on success
        res.redirect('/dashboard');
    } catch (error) {
        console.error("Login UI Error:", error);

        let errorMessage = 'An error occurred during login';
        if (error.response) {
            errorMessage = error.response.data?.message || 'Invalid credentials';
        } else if (error.request) {
            errorMessage = 'Login service unavailable';
        }

        res.render('login', {
            title: 'Login - IBLib',
            error: errorMessage
        });
    }
});

// Logout route
router.get('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/ui/login');
});

/**
 * Get user from cache by userId
 */
export const getUserFromCache = (userId) => {
    const cachedData = userCache.get(userId);

    if (!cachedData) {
        return null;
    }

    // Check if cache is expired
    if (Date.now() - cachedData.timestamp > CACHE_TTL) {
        userCache.delete(userId);
        return null;
    }

    return cachedData.userData;
};

/**
 * Clear user cache by userId or all if no userId provided
 */
export const clearUserCache = (userId) => {
    if (userId) {
        userCache.delete(userId);
    } else {
        userCache.clear();
    }
};

// Export the router and middlewares
export { router };