import axios from 'axios';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';

// Create router for API endpoints
const router = express.Router();

const loginurl = `https://www.iblib.com/api/login`;

// Simple in-memory cache for user data
const userCache = new Map();

// UI Routes
router.get('/login', (req, res) => {
    // Check if user is already logged in
    const token = req.cookies?.auth_token;
    if (token) {
        // Find if this token exists in cache
        for (const [userId, data] of userCache.entries()) {
            if (data.userData.access_token === token) {
                // Redirect to dashboard if already logged in
                return res.redirect('/dashboard');
            }
        }
    }

    // Render login page
    res.render('login', {
        title: 'Login - IBLib',
        error: req.query.error || null
    });
});

// API Routes
// router.post('/api/login', async (req, res) => {
//     try {
//         // Extract login credentials from request body
//         const { user, password } = req.body;

//         if (!user || !password) {
//             return res.status(400).json({
//                 message: 'Username and password are required'
//             });
//         }

//         // Prepare login payload with required static fields
//         const loginPayload = {
//             user,
//             password,
//             fcmId: "",
//             androidVersion: "9",
//             androidVersionCode: "28",
//             appVersion: "1.0",
//             appVersionCode: "1"
//         };

//         // Make request to login API
//         const response = await axios.post(loginurl, loginPayload);

//         // Extract user data from response
//         const userData = response.data;

//         if (!userData || !userData.access_token) {
//             return res.status(401).json({
//                 message: 'Invalid credentials'
//             });
//         }

//         // Store user data in cache with token as key
//         userCache.set(userData.userId, {
//             userData,
//             timestamp: Date.now()
//         });

//         // Set auth cookies if needed (optional)
//         res.cookie('auth_token', userData.access_token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === 'production',
//             maxAge: 3600000 // 1 hour
//         });

//         // Return success response with user data
//         res.status(200).json({
//             message: 'Login successful',
//             user: {
//                 userId: userData.userId,
//                 userName: userData.userName,
//                 firstName: userData.firstName,
//                 lastName: userData.lastName,
//                 loginType: userData.loginType,
//                 idSchool: userData.idSchool,
//                 schoolName: userData.schoolName,
//                 loginImage: userData.loginImage,
//                 curr: userData.curr,
//                 currYear: userData.currYear
//             },
//             token: userData.access_token
//         });

//     } catch (error) {
//         console.error("Login Error:", error);

//         // Handle specific error types
//         if (error.response) {
//             // The request was made and the server responded with a status code
//             // that falls out of the range of 2xx
//             return res.status(error.response.status).json({
//                 message: 'Login failed',
//                 error: error.response.data.message || 'Server returned an error'
//             });
//         } else if (error.request) {
//             // The request was made but no response was received
//             return res.status(503).json({
//                 message: 'Login service unavailable',
//                 error: 'No response from authentication server'
//             });
//         } else {
//             // Something happened in setting up the request that triggered an Error
//             return res.status(500).json({
//                 message: 'An error occurred during authentication',
//                 error: error.message
//             });
//         }
//     }
// });

// Handle form-based login submission
router.post('/ui/login', async (req, res) => {
    try {
        const { user, password } = req.body;

        if (!user || !password) {
            return res.render('login', {
                title: 'Login - IBLib',
                error: 'Username and password are required'
            });
        }

        // Prepare login payload with required static fields
        const loginPayload = {
            user,
            password,
            fcmId: "",
            androidVersion: "9",
            androidVersionCode: "28",
            appVersion: "1.0",
            appVersionCode: "1"
        };

        // Make request to login API
        const response = await axios.post(loginurl, loginPayload);
        const userData = response.data;

        // Store user data in cache
        userCache.set(userData.userId, {
            userData,
            timestamp: Date.now()
        });

        // Set auth cookies
        res.cookie('auth_token', userData.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 3600000 // 1 hour
        });

        // Redirect to dashboard on success
        res.redirect('/dashboard');

    } catch (error) {
        console.error("Login UI Error:", error);

        // Handle login failure
        let errorMessage = 'An error occurred during login';

        if (error.response) {
            errorMessage = error.response.data.message || 'Invalid credentials';
        } else if (error.request) {
            errorMessage = 'Login service unavailable';
        }

        res.render('login', {
            title: 'Login - IBLib',
            error: errorMessage
        });
    }
});

// Helper functions for managing user cache

// Get user from cache
export const getUserFromCache = (userId) => {
    const cachedData = userCache.get(userId);

    if (!cachedData) {
        return null;
    }

    // Check if cache is expired (24 hours)
    const cacheTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - cachedData.timestamp > cacheTTL) {
        userCache.delete(userId);
        return null;
    }

    return cachedData.userData;
};

// Clear user cache
export const clearUserCache = (userId) => {
    if (userId) {
        userCache.delete(userId);
    } else {
        userCache.clear();
    }
};

// Middleware to verify token and attach user data to request
export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] ||
            req.cookies?.auth_token;

        if (!token) {
            return res.status(401).json({
                message: 'Authentication required'
            });
        }

        // Find user by token (in a real app, you'd verify the JWT)
        // This is a simplified approach
        let userData = null;
        for (const [userId, data] of userCache.entries()) {
            if (data.userData.access_token === token) {
                userData = data.userData;
                break;
            }
        }

        if (!userData) {
            return res.status(401).json({
                message: 'Invalid or expired token'
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

// UI middleware for checking authentication
export const uiAuthMiddleware = (req, res, next) => {
    const token = req.cookies?.auth_token;

    if (!token) {
        return res.redirect('/ui/login?error=Session+expired.+Please+login+again.');
    }

    // Find user by token
    let userData = null;
    for (const [userId, data] of userCache.entries()) {
        if (data.userData.access_token === token) {
            userData = data.userData;
            break;
        }
    }

    if (!userData) {
        return res.redirect('/ui/login?error=Invalid+session.+Please+login+again.');
    }

    // Attach user data to request
    req.user = userData;
    next();
};

// Logout route
router.get('/logout', (req, res) => {
    // Clear the auth cookie
    res.clearCookie('auth_token');
    // Redirect to login page
    res.redirect('/ui/login');
});

// Export the router and middlewares
export { router };