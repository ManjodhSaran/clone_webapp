import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Educational Content API',
      version: '1.0.0',
      description: 'API for managing educational content, user authentication, and subject archiving',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'auth_token'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'Unique user identifier' },
            userName: { type: 'string', description: 'Username' },
            firstName: { type: 'string', description: 'First name' },
            lastName: { type: 'string', description: 'Last name' },
            loginType: { type: 'string', description: 'Type of login' },
            idSchool: { type: 'string', description: 'School identifier' },
            schoolName: { type: 'string', description: 'School name' },
            loginImage: { type: 'string', description: 'Profile image URL' },
            curr: { type: 'string', description: 'Current curriculum' },
            currYear: { type: 'string', description: 'Current year' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['user', 'password'],
          properties: {
            user: { type: 'string', description: 'Username' },
            password: { type: 'string', description: 'Password' }
          }
        },
        EducationalContent: {
          type: 'object',
          properties: {
            definition: { type: 'string', description: 'Clear definition of the concept' },
            explanation: { type: 'string', description: 'Detailed explanation' },
            examples: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Real-world examples'
            },
            misconceptions: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Common misconceptions'
            },
            images: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Image URLs or descriptions'
            }
          }
        },
        Subject: {
          type: 'object',
          properties: {
            curriculum: { type: 'string', description: 'Curriculum name' },
            year: { type: 'string', description: 'Academic year' },
            subject: { type: 'string', description: 'Subject name' }
          }
        },
        ApiError: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Error message' },
            error: { type: 'string', description: 'Error details' }
          }
        }
      }
    },
    security: [
      { bearerAuth: [] },
      { cookieAuth: [] }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/v1/routes/*.js',
    './src/v1/controllers/*.js'
  ]
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };