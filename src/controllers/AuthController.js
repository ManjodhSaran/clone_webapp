import { UserService } from '../services/UserService.js';
import { handleApiError } from '../utils/errorHandler.js';

export class AuthController {
  static async login(req, res) {
    try {
      const { username: user, password } = req.body;
      const userData = await UserService.login({ user, password });

      res.cookie('auth_token', userData.access_token, UserService.getCookieOptions());

      res.status(200).json({
        message: 'Login successful',
        user: userData
      });
    } catch (error) {
      handleApiError(error, res);
    }
  }

  static async uiLogin(req, res) {
    try {
      const { user, password } = req.body;

      if (!user || !password) {
        return res.render('login', {
          title: 'Login - IBLib',
          error: 'Username and password are required'
        });
      }

      const userData = await UserService.login({ user, password });

      UserService.clearUserCache();
      res.cookie('auth_token', userData.access_token, UserService.getCookieOptions());
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
  }

  static logout(req, res) {
    res.clearCookie('auth_token');
    res.redirect('/ui/login');
  }

  static renderLoginPage(req, res) {
    const token = req.cookies?.auth_token;
    const userData = UserService.getUserFromToken(token);

    if (userData) {
      return res.redirect('/dashboard');
    }

    res.render('login', {
      title: 'Login - IBLib',
      error: req.query.error || null
    });
  }
}