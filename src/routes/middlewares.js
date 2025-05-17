// ============= MIDDLEWARE =============

import { UserController } from "./controller.js";

/**
 * Middleware to verify token and attach user data to request
 */
export const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;

        // const userData = UserController.getUserFromToken(token);

        // if (!userData) {
        //     return res.status(401).json({
        //         message: 'Authentication required'
        //     });
        // }

        // // Attach user data to request
        // req.user = userData;
        req.token = token;
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
    // const userData = UserController.getUserFromToken(token);

    // if (!userData) {
    //     return res.redirect('/ui/login?error=Session+expired.+Please+login+again.');
    // }

    // Attach user data to request
    // req.user = userData;
    req.token = token;
    next();
};
