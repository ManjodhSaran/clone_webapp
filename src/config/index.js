import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET || 'iblib-session-secret'
  },
  
  api: {
    baseUrl: process.env.API_BASE_URL || 'https://iblib.com/api',
    timeout: parseInt(process.env.API_TIMEOUT) || 30000
  },
  
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiUrl: 'https://api.anthropic.com/v1/messages',
    openaiImageApiUrl: 'https://api.openai.com/v1/images/generations'
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'iblib-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
  },
  
  archiver: {
    maxDepth: 3,
    maxPagesPerDomain: 10000,
    maxTotalPages: 50000,
    maxConcurrent: 5,
    excludeExtensions: ['.pdf', '.zip', '.rar', '.exe', '.dmg', '.iso', '.apk', '.tar', '.gz', '.7z', '.mp3', '.mp4', '.avi', '.mov', '.mkv'],
    timeout: 30000,
    maxAssetSize: 50 * 1024 * 1024,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    sameDomainOnly: false
  },
  
  ai_models: {
    allowed: [
      'claude-3-haiku-20240307',
      'claude-3-sonnet-20240229',
      'claude-3-opus-20240229',
      'claude-2.1',
      'claude-instant-1.2',
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gemini-1.5-pro',
      'gemini-1.0-pro',
      'mistral-7b-instruct',
      'mixtral-8x7b',
      'llama-3-70b',
      'llama-3-8b'
    ],
    default: 'claude-3-haiku-20240307'
  }
};

export const apiEndpoints = {
  login: `${config.api.baseUrl}/login`,
  getChapters: `${config.api.baseUrl}/study/chapters`,
  getCourses: `${config.api.baseUrl}/study/courses`,
  getYears: `${config.api.baseUrl}/study/getyear`,
  subjectOfflineFile: `${config.api.baseUrl}/content/offline/subject`,
  subjectOfflineStatus: `${config.api.baseUrl}/content/offline/subject/status`,
  subjectOfflineStatusUpdate: `${config.api.baseUrl}/content/offline/subject/status/update?isOffline=1`,
  uploadFile: `${config.api.baseUrl}/uploadfile`,
  subjects: (curr, currYear) => `${config.api.baseUrl}/study/subjects?curr=${curr}&currYear=${currYear}`,
  htmlBase: `${config.api.baseUrl.replace('/api', '')}/user/html/topic/`
};