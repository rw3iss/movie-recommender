// src/routes/authRoutes.ts
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from '../services/AuthService';
import { DatabaseService } from '../services/DatabaseService';
import { AuthController } from '../controllers/AuthController';
import { EmailService } from '../services/EmailService';
import {
  RegisterBody,
  LoginBody,
  RefreshTokenBody,
  ResetPasswordBody,
  ChangePasswordBody,
  VerifyEmailBody,
  OAuth2CallbackQuery
} from '../types/auth.types';

export async function authRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Initialize services
  const databaseService = new DatabaseService(fastify.pg);
  const emailService = new EmailService();
  const authService = new AuthService(databaseService, emailService);
  const authController = new AuthController(authService);

  // Register new user
  fastify.post<{
    Body: RegisterBody
  }>('/register', {
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string', minLength: 3, maxLength: 30 },
          password: { type: 'string', minLength: 8, maxLength: 100 }
        },
        required: ['email', 'username', 'password']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                username: { type: 'string' },
                createdAt: { type: 'string' }
              }
            },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            field: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      return authController.register(request, reply);
    }
  });

  // Login
  fastify.post<{
    Body: LoginBody
  }>('/login', {
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
          rememberMe: { type: 'boolean', default: false }
        },
        required: ['email', 'password']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                username: { type: 'string' },
                emailVerified: { type: 'boolean' }
              }
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'number' }
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      return authController.login(request, reply);
    }
  });

  // Logout
  fastify.post('/logout', {
    preHandler: fastify.authenticate,
    handler: async (request, reply) => {
      return authController.logout(request, reply);
    }
  });

  // Refresh access token
  fastify.post<{
    Body: RefreshTokenBody
  }>('/refresh', {
    schema: {
      body: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' }
        },