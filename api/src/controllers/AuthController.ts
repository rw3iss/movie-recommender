import { FastifyRequest, FastifyReply } from "fastify";
import { AuthService } from "../services/AuthService";
import { Errors } from "../utils/errorHandler";
import {
    RegisterBody,
    LoginBody,
    RefreshTokenBody,
    ResetPasswordBody,
    ChangePasswordBody,
    VerifyEmailBody,
    ForgotPasswordBody,
} from "../types/auth.types";

/**
 * Authentication controller
 * Handles user authentication and authorization endpoints
 */
export class AuthController {
    constructor(private authService: AuthService) {}

    /**
     * Register a new user
     * @route POST /api/v1/auth/register
     */
    async register(request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
        try {
            const { email, username, password } = request.body;

            // Check if user already exists
            const existingUser = await this.authService.findUserByEmail(email);
            if (existingUser) {
                throw Errors.conflict("Email already registered");
            }

            // Create new user
            const user = await this.authService.createUser({
                email,
                username,
                password,
            });

            // Send verification email
            await this.authService.sendVerificationEmail(user);

            reply.status(201).send({
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    createdAt: user.createdAt,
                },
                message: "Registration successful. Please check your email to verify your account.",
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Login user
     * @route POST /api/v1/auth/login
     */
    async login(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
        try {
            const { email, password, rememberMe } = request.body;

            // Validate credentials
            const user = await this.authService.validateCredentials(email, password);
            if (!user) {
                throw Errors.unauthorized("Invalid email or password");
            }

            // Generate tokens
            const { accessToken, refreshToken } = await this.authService.generateTokens(user);

            // Set cookies if rememberMe
            if (rememberMe) {
                reply.setCookie("token", accessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                });

                reply.setCookie("refreshToken", refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                });
            }

            reply.send({
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    emailVerified: user.emailVerified,
                    role: user.role,
                },
                accessToken,
                refreshToken,
                expiresIn: 604800, // 7 days in seconds
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Logout user
     * @route POST /api/v1/auth/logout
     */
    async logout(request: FastifyRequest, reply: FastifyReply) {
        try {
            // Clear cookies
            reply.clearCookie("token");
            reply.clearCookie("refreshToken");

            // Invalidate refresh token if present
            const refreshToken = request.cookies.refreshToken || request.body.refreshToken;
            if (refreshToken) {
                await this.authService.invalidateRefreshToken(refreshToken);
            }

            reply.send({ message: "Logout successful" });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Refresh access token
     * @route POST /api/v1/auth/refresh
     */
    async refreshToken(request: FastifyRequest<{ Body: RefreshTokenBody }>, reply: FastifyReply) {
        try {
            const { refreshToken } = request.body;

            const tokens = await this.authService.refreshTokens(refreshToken);

            reply.send(tokens);
        } catch (error) {
            throw Errors.unauthorized("Invalid refresh token");
        }
    }

    /**
     * Request password reset
     * @route POST /api/v1/auth/forgot-password
     */
    async forgotPassword(request: FastifyRequest<{ Body: ForgotPasswordBody }>, reply: FastifyReply) {
        try {
            const { email } = request.body;

            await this.authService.requestPasswordReset(email);

            // Always return success to prevent email enumeration
            reply.send({
                message: "If an account exists with this email, a password reset link has been sent.",
            });
        } catch (error) {
            // Log error but don't expose it
            request.log.error("Password reset error:", error);
            reply.send({
                message: "If an account exists with this email, a password reset link has been sent.",
            });
        }
    }

    /**
     * Reset password
     * @route POST /api/v1/auth/reset-password
     */
    async resetPassword(request: FastifyRequest<{ Body: ResetPasswordBody }>, reply: FastifyReply) {
        try {
            const { token, newPassword } = request.body;

            await this.authService.resetPassword(token, newPassword);

            reply.send({
                message: "Password reset successful. You can now login with your new password.",
            });
        } catch (error) {
            throw Errors.badRequest("Invalid or expired reset token");
        }
    }

    /**
     * Change password (authenticated)
     * @route POST /api/v1/auth/change-password
     */
    async changePassword(request: FastifyRequest<{ Body: ChangePasswordBody }>, reply: FastifyReply) {
        try {
            if (!request.user) {
                throw Errors.unauthorized();
            }

            const { currentPassword, newPassword } = request.body;

            await this.authService.changePassword(request.user.userId, currentPassword, newPassword);

            reply.send({
                message: "Password changed successfully",
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Verify email
     * @route POST /api/v1/auth/verify-email
     */
    async verifyEmail(request: FastifyRequest<{ Body: VerifyEmailBody }>, reply: FastifyReply) {
        try {
            const { token } = request.body;

            await this.authService.verifyEmail(token);

            reply.send({
                message: "Email verified successfully",
            });
        } catch (error) {
            throw Errors.badRequest("Invalid or expired verification token");
        }
    }

    /**
     * Resend verification email
     * @route POST /api/v1/auth/resend-verification
     */
    async resendVerification(request: FastifyRequest, reply: FastifyReply) {
        try {
            if (!request.user) {
                throw Errors.unauthorized();
            }

            await this.authService.resendVerificationEmail(request.user.userId);

            reply.send({
                message: "Verification email sent",
            });
        } catch (error) {
            throw error;
        }
    }
}
