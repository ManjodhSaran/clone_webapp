import axios from 'axios';
import { getSubjectsFromRequest } from '../v1/lib/getUrls.js';


// Cache configuration
const userCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000 // 1 hour
};


// ============= CONFIGURATION =============
// API endpoints
const API_BASE = 'https://test.iblib.com/api';
const API_ENDPOINTS = {
    login: `${API_BASE}/login`,
    getChapters: `${API_BASE}/study/chapters`,
    subjectOfflineFile: `${API_BASE}/content/offline/subject`,
    subjectOfflineStatus: `${API_BASE}/content/offline/subject/status`,
    subjectOfflineStatusUpdate: `${API_BASE}/content/offline/subject/status?isOffline=1`
};

/**
 * User Controller functions
 */
export const UserController = {
    /**
     * Get user from token
     */
    getUserFromToken: (token) => {
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
    },

    /**
     * Get user from cache by userId
     */
    getUserFromCache: (userId) => {
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
    },

    /**
     * Clear user cache by userId or all if no userId provided
     */
    clearUserCache: (userId) => {
        if (userId) {
            userCache.delete(userId);
        } else {
            userCache.clear();
        }
    },

    /**
     * Login handler
     */
    login: async (req, res) => {
        const { username: user, password } = req.body;
        console.log('req.body', JSON.stringify(req.body, null, 2));

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
                    ...userData
                },
            });
        } catch (error) {
            ErrorController.handleApiError(error, res);
        }
    },

    /**
     * UI Login handler
     */
    uiLogin: async (req, res) => {
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
    },

    /**
     * Logout handler
     */
    logout: (req, res) => {
        res.clearCookie('auth_token');
        res.redirect('/ui/login');
    },

    /**
     * Login page renderer
     */
    renderLoginPage: (req, res) => {
        const token = req.cookies?.auth_token;
        const userData = UserController.getUserFromToken(token);

        if (userData) {
            return res.redirect('/dashboard');
        }

        res.render('login', {
            title: 'Login - IBLib',
            error: req.query.error || null
        });
    }
};

/**
 * Subject Controller functions
 */
export const SubjectController = {
    /**
     * Validate subject query parameters
     */
    validateSubjectParams: (params) => {
        const { curr, currYear, subject } = params;
        return curr && currYear && subject;
    },

    /**
     * Get subjects
     */
    getChapters: async (req, res) => {
        if (!SubjectController.validateSubjectParams(req.query)) {
            return res.status(400).json({
                message: 'Curriculum, curriculum year, and subject are required'
            });
        }

        try {
            const { curr, currYear, subject } = req.query;
            const payload = { curr, currYear, subject };

            const response = await axios.post(
                API_ENDPOINTS.getChapters,
                payload,
                {
                    headers: {
                        Authorization: `${req.token}`
                    }
                }
            );

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
            ErrorController.handleApiError(error, res);
        }
    },
    getSubjects: async (req, res) => {
        try {
            const { curr, currYear } = req.query;
            console.log('req.query', JSON.stringify(req.query, null, 2));

            if (!curr || !currYear) {
                return res.status(400).json({
                    message: 'Curriculum and curriculum year are required'
                });
            }

            const subjects = await getSubjectsFromRequest({
                token: req.token,
                curr,
                currYear
            });
            console.log('subjects', JSON.stringify(subjects, null, 2));
            res.status(200).json({
                message: 'Subject data retrieved successfully',
                data: subjects
            });
        } catch (error) {
            ErrorController.handleApiError(error, res);
        }
    },

    /**
     * Get offline subject
     */
    getOfflineSubject: async (req, res) => {
        if (!SubjectController.validateSubjectParams(req.query)) {
            return res.status(400).json({
                message: 'Curriculum, curriculum year, and subject are required'
            });
        }

        try {
            const { curr, currYear, subject } = req.query;
            const payload = { curr, currYear, subject };

            const response = await axios.post(
                API_ENDPOINTS.subjectOfflineFile,
                payload,
                {
                    headers: {
                        Authorization: `${req.token}`
                    }
                }
            );

            const subjectData = response.data;
            if (!subjectData) {
                return res.status(404).json({
                    message: 'Subject data not found'
                });
            }

            res.status(200).json({
                message: 'Subject data retrieved successfully',
                url: subjectData?.response
            });
        } catch (error) {
            ErrorController.handleApiError(error, res);
        }
    },

    /**
     * Get offline subject status
     */
    getOfflineSubjectStatus: async (req, res) => {
        if (!SubjectController.validateSubjectParams(req.query)) {
            return res.status(400).json({
                message: 'Curriculum, curriculum year, and subject are required'
            });
        }

        try {
            const { curr, currYear, subject } = req.query;
            const payload = { curr, currYear, subject };
            console.log('payload', payload)
            console.log('req.token', req.token)

            const response = await axios.post(
                API_ENDPOINTS.subjectOfflineStatus,
                payload,
                {
                    headers: {
                        Authorization: `${req.token}`
                    }
                }
            );

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
            ErrorController.handleApiError(error, res);
        }
    },

    /**
     * Update offline subject status
     */
    updateOfflineSubjectStatus: async (req, res) => {
        if (!SubjectController.validateSubjectParams(req.body)) {
            return res.status(400).json({
                message: 'Curriculum, curriculum year, and subject are required'
            });
        }

        try {
            const { curr, currYear, subject } = req.body;
            const payload = { curr, currYear, subject };

            const response = await axios.post(
                API_ENDPOINTS.subjectOfflineStatusUpdate,
                payload,
                {
                    headers: {
                        Authorization: `${req.token}`
                    }
                }
            );

            const subjectStatus = response.data;
            console.log('response.data', JSON.stringify(response.data, null, 2));
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
            ErrorController.handleApiError(error, res);
        }
    }
};

/**
 * Error Controller functions
 */
export const ErrorController = {
    /**
     * Handle API errors
     */
    handleApiError: (error, res) => {
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
    }
};
