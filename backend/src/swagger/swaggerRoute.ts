import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Bug Tracker Lite API',
    version: '1.0.0',
    description: 'REST API documentation for Bug Tracker Lite issue tracking application with S3 image attachment integration.',
  },
  servers: [
    {
      url: '/api',
      description: 'Default API Endpoint',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Bug: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'med', 'high'] },
          status: { type: 'string', enum: ['open', 'in-progress', 'closed'] },
          imageKey: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'fail' },
          code: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Check API and Database Health',
        responses: {
          200: { description: 'API is healthy' },
          503: { description: 'API or database is degraded' },
        },
      },
    },
    '/auth/signup': {
      post: {
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alice Smith' },
                  email: { type: 'string', example: 'alice@example.com' },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Account created successfully' },
          400: { description: 'Validation error' },
          409: { description: 'Email already exists' },
          429: { description: 'Too many requests' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in and obtain JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'alice@example.com' },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully' },
          401: { description: 'Invalid credentials' },
          429: { description: 'Too many requests' },
        },
      },
    },
    '/bugs/upload-url': {
      post: {
        summary: 'Request pre-signed S3 upload URL for direct-to-S3 upload',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fileName', 'fileType'],
                properties: {
                  fileName: { type: 'string', example: 'screenshot.png' },
                  fileType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] },
                  fileSize: { type: 'integer', example: 1048576 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Pre-signed S3 PUT URL generated' },
          400: { description: 'Invalid file type or size' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/bugs': {
      get: {
        summary: 'List bugs belonging to authenticated user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['open', 'in-progress', 'closed'] },
            description: 'Filter bugs by status',
          },
        ],
        responses: {
          200: { description: 'List of owned bugs' },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create a new bug',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'severity'],
                properties: {
                  title: { type: 'string', example: 'Button misalignment on mobile' },
                  description: { type: 'string', example: 'The submit button overflows on iPhone screen' },
                  severity: { type: 'string', enum: ['low', 'med', 'high'] },
                  status: { type: 'string', enum: ['open', 'in-progress', 'closed'], default: 'open' },
                  imageKey: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Bug created' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/bugs/{id}': {
      get: {
        summary: 'Get bug details with pre-signed GET image URL',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Bug details' },
          403: { description: 'Forbidden (not owner)' },
          404: { description: 'Not found' },
        },
      },
      put: {
        summary: 'Update a bug (ownership verified)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'med', 'high'] },
                  status: { type: 'string', enum: ['open', 'in-progress', 'closed'] },
                  imageKey: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Bug updated' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
      delete: {
        summary: 'Delete bug and S3 image (ownership verified)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Bug deleted' },
          403: { description: 'Forbidden' },
          404: { description: 'Not found' },
        },
      },
    },
  },
};

const router = Router();
router.get('/json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerDocument);
});
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export const swaggerRoute = router;
