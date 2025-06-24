import axios from 'axios';
import { apiEndpoints, config } from '../config/index.js';

const userCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.server.nodeEnv === 'production',
  maxAge: 3600000
};

export class UserService {
  static getUserFromToken(token) {
    if (!token) return null;

    for (const [userId, data] of userCache.entries()) {
      if (data.userData.access_token === token) {
        if (Date.now() - data.timestamp > CACHE_TTL) {
          userCache.delete(userId);
          return null;
        }
        return data.userData;
      }
    }
    return null;
  }

  static getUserFromCache(userId) {
    const cachedData = userCache.get(userId);

    if (!cachedData) return null;

    if (Date.now() - cachedData.timestamp > CACHE_TTL) {
      userCache.delete(userId);
      return null;
    }

    return cachedData.userData;
  }

  static clearUserCache(userId) {
    if (userId) {
      userCache.delete(userId);
    } else {
      userCache.clear();
    }
  }

  static async login(credentials) {
    const { user, password } = credentials;

    if (!user || !password) {
      throw new Error('Username and password are required');
    }

    const loginPayload = {
      user,
      password,
      fcmId: "",
      androidVersion: "9",
      androidVersionCode: "28",
      appVersion: "1.0",
      appVersionCode: "1"
    };

    const response = await axios.post(apiEndpoints.login, loginPayload);
    const userData = response.data;

    if (!userData || !userData.access_token) {
      throw new Error('Invalid credentials');
    }

    userCache.set(userData.userId, {
      userData,
      timestamp: Date.now()
    });

    return userData;
  }

  static getCookieOptions() {
    return COOKIE_OPTIONS;
  }
}