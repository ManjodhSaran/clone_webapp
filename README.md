# Educational Content API

A modern Node.js API for managing educational content, user authentication, and subject archiving.

## Features

- 🔐 User authentication and session management
- 📚 Educational content generation using AI
- 📁 Subject archiving and offline access
- 🎯 RESTful API with comprehensive documentation
- 🌐 Web interface for dashboard management
- 📊 Swagger API documentation

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Package Manager**: Yarn
- **Documentation**: Swagger/OpenAPI
- **AI Integration**: Anthropic Claude, OpenAI
- **View Engine**: EJS
- **Module System**: ES6 Modules

## Quick Start

### Prerequisites

- Node.js 18 or higher
- Yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd clone_webapp

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
yarn dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-session-secret

# API Configuration
API_BASE_URL=https://iblib.com/api
API_TIMEOUT=30000

# AI Configuration
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key

# CORS Configuration
CORS_ORIGIN=*
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Dashboard**: http://localhost:3000/dashboard

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── index.js      # Main configuration
│   └── swagger.js    # Swagger documentation setup
├── controllers/      # Request handlers
│   ├── AuthController.js
│   ├── SubjectController.js
│   ├── ArchiveController.js
│   └── StudyController.js
├── services/         # Business logic
│   ├── UserService.js
│   ├── SubjectService.js
│   └── ArchiveService.js
├── routes/           # Route definitions
│   ├── api/          # API routes
│   │   ├── index.js
│   │   ├── auth.js
│   │   ├── subjects.js
│   │   ├── archive.js
│   │   └── study.js
│   └── web/          # Web interface routes
│       └── index.js
├── middleware/       # Custom middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── logger.js
├── lib/              # Core libraries
├── utils/            # Utility functions
├── helpers/          # Helper functions
├── views/            # EJS templates
└── server.js         # Application entry point
```

## Available Scripts

```bash
# Development
yarn dev              # Start with auto-reload

# Production
yarn start            # Start production server

# Utilities
yarn build            # Build (placeholder)
yarn lint             # Lint code (placeholder)
yarn test             # Run tests (placeholder)
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /ui/login` - Login page
- `POST /ui/login` - Web form login
- `GET /logout` - User logout

### Subjects
- `GET /api/subjects` - Get subjects
- `GET /api/subjects/courses` - Get available courses
- `GET /api/subjects/years` - Get academic years
- `GET /api/subjects/:id/chapters` - Get subject chapters
- `GET /api/subjects/offline/url` - Get offline download URL
- `GET /api/subjects/offline/status` - Check offline status
- `POST /api/subjects/offline/status` - Update offline status

### Archive
- `POST /api/archive` - Archive content
- `GET /api/archive/download/:filename` - Download archived content

### Study
- `GET /api/study/generate/:word` - Generate educational content

## Configuration

The application uses a centralized configuration system in `src/config/index.js`. Key configuration areas:

- **Server**: Port, environment, session settings
- **API**: Base URLs, timeouts
- **AI**: API keys for Anthropic and OpenAI
- **CORS**: Cross-origin settings
- **Archiver**: Web scraping and archiving settings

## Development

### Code Style
- ES6 modules throughout
- Async/await for asynchronous operations
- Class-based controllers and services
- Centralized error handling
- Comprehensive logging

### Adding New Features
1. Create service in `src/services/`
2. Create controller in `src/controllers/`
3. Add routes in `src/routes/api/`
4. Update Swagger documentation
5. Add configuration if needed

## License

ISC License