import { UserService } from '../services/UserService.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
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

export const uiAuthMiddleware = (req, res, next) => {
  const token = req.cookies?.auth_token;
  req.token = token;
  next();
};