import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { DatabaseService } from "./DatabaseService";
import { EmailService } from "./EmailService";
import { config } from "../config";
import { Errors } from "../utils/errorHandler";

interface User {
    id: string;
    email: string;
    username: string;
    password?: string;
    emailVerified: boolean;
    role: string;
    createdAt: string;
    updatedAt: string;
}

interface CreateUserData {
    email: string;
    username: string;
    password: string;
}

/**
 * Authentication service
 * Handles user authentication, authorization, and account management
 */
export class AuthService {
    private saltRounds = 10;

    constructor(private databaseService: DatabaseService, private emailService: EmailService) {}

    /**
     * Create a new user
     */
    async createUser(data: CreateUserData): Promise<User> {
        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, this.saltRounds);

        // Create user in database
        const user = await this.databaseService.createUser({
            email: data.email.toLowerCase(),
            username: data.username,
            password: hashedPassword,
            emailVerified: false,
            role: "user",
        });

        return user;
    }

    /**
     * Find user by email
     */
    async findUserByEmail(email: string): Promise<User | null> {
        return this.databaseService.findUserByEmail(email.toLowerCase());
    }

    /**
     * Find user by ID
     */
    async findUserById(userId: string): Promise<User | null> {
        return this.databaseService.findUserById(userId);
    }

    /**
     * Validate user credentials
     */
    async validateCredentials(email: string, password: string): Promise<User | null> {
        const user = await this.findUserByEmail(email);
        if (!user || !user.password) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return null;
        }

        // Remove password from response
        delete user.password;
        return user;
    }

    /**
     * Generate access and refresh tokens
     */
    async generateTokens(user: User): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        // Note: In a real implementation, you'd use the fastify.jwt.sign method
        // This is a placeholder
        const accessToken = this.generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        const refreshToken = this.generateToken(
            {
                userId: user.id,
                type: "refresh",
            },
            "30d"
        );

        // Store refresh token
        await this.databaseService.saveRefreshToken(user.id, refreshToken);

        return { accessToken, refreshToken };
    }

    /**
     * Generate a token (placeholder - should use fastify.jwt)
     */
    private generateToken(payload: any, expiresIn: string = "7d"): string {
        // This is a placeholder - in real implementation, use fastify.jwt.sign
        return Buffer.from(
            JSON.stringify({
                ...payload,
                exp: Date.now() + this.parseExpiration(expiresIn),
            })
        ).toString("base64");
    }

    /**
     * Parse expiration string to milliseconds
     */
    private parseExpiration(exp: string): number {
        const match = exp.match(/^(\d+)([dhms])$/);
        if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

        const [, num, unit] = match;
        const value = parseInt(num);

        switch (unit) {
            case "d":
                return value * 24 * 60 * 60 * 1000;
            case "h":
                return value * 60 * 60 * 1000;
            case "m":
                return value * 60 * 1000;
            case "s":
                return value * 1000;
            default:
                return 7 * 24 * 60 * 60 * 1000;
        }
    }

    /**
     * Refresh access token
     */
    async refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }> {
        // Validate refresh token
        const tokenData = await this.databaseService.findRefreshToken(refreshToken);
        if (!tokenData || tokenData.expiresAt < new Date()) {
            throw Errors.unauthorized("Invalid refresh token");
        }

        // Get user
        const user = await this.findUserById(tokenData.userId);
        if (!user) {
            throw Errors.unauthorized("User not found");
        }

        // Invalidate old refresh token
        await this.invalidateRefreshToken(refreshToken);

        // Generate new tokens
        return this.generateTokens(user);
    }

    /**
     * Invalidate refresh token
     */
    async invalidateRefreshToken(refreshToken: string): Promise<void> {
        await this.databaseService.deleteRefreshToken(refreshToken);
    }

    /**
     * Send verification email
     */
    async sendVerificationEmail(user: User): Promise<void> {
        const token = this.generateVerificationToken();

        // Save token
        await this.databaseService.saveVerificationToken(user.id, token, "email_verification");

        // Send email
        const verificationUrl = `${config.APP_URL}/verify-email?token=${token}`;
        await this.emailService.sendEmailVerification(user.email, {
            username: user.username,
            verificationUrl,
        });
    }

    /**
     * Resend verification email
     */
    async resendVerificationEmail(userId: string): Promise<void> {
        const user = await this.findUserById(userId);
        if (!user) {
            throw Errors.notFound("User");
        }

        if (user.emailVerified) {
            throw Errors.badRequest("Email already verified");
        }

        await this.sendVerificationEmail(user);
    }

    /**
     * Verify email with token
     */
    async verifyEmail(token: string): Promise<void> {
        const tokenData = await this.databaseService.findVerificationToken(token, "email_verification");
        if (!tokenData || tokenData.expiresAt < new Date()) {
            throw Errors.badRequest("Invalid or expired verification token");
        }

        // Update user
        await this.databaseService.updateUser(tokenData.userId, {
            emailVerified: true,
        });

        // Delete token
        await this.databaseService.deleteVerificationToken(token);
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<void> {
        const user = await this.findUserByEmail(email);
        if (!user) {
            // Don't reveal if user exists
            return;
        }

        const token = this.generateVerificationToken();

        // Save token
        await this.databaseService.saveVerificationToken(user.id, token, "password_reset");

        // Send email
        const resetUrl = `${config.APP_URL}/reset-password?token=${token}`;
        await this.emailService.sendPasswordResetEmail(user.email, {
            username: user.username,
            resetUrl,
        });
    }

    /**
     * Reset password with token
     */
    async resetPassword(token: string, newPassword: string): Promise<void> {
        const tokenData = await this.databaseService.findVerificationToken(token, "password_reset");
        if (!tokenData || tokenData.expiresAt < new Date()) {
            throw Errors.badRequest("Invalid or expired reset token");
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

        // Update user password
        await this.databaseService.updateUser(tokenData.userId, {
            password: hashedPassword,
        });

        // Delete token
        await this.databaseService.deleteVerificationToken(token);

        // Invalidate all refresh tokens for security
        await this.databaseService.deleteAllUserRefreshTokens(tokenData.userId);
    }

    /**
     * Change password (authenticated)
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        const user = await this.databaseService.findUserById(userId, true); // Include password
        if (!user || !user.password) {
            throw Errors.notFound("User");
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            throw Errors.badRequest("Current password is incorrect");
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

        // Update password
        await this.databaseService.updateUser(userId, {
            password: hashedPassword,
        });

        // Invalidate all refresh tokens for security
        await this.databaseService.deleteAllUserRefreshTokens(userId);
    }

    /**
     * Generate verification token
     */
    private generateVerificationToken(): string {
        return crypto.randomBytes(32).toString("hex");
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
        // Remove sensitive fields
        delete data.password;
        delete data.id;
        delete data.email; // Email change requires verification
        delete data.role; // Role can't be self-assigned

        const updatedUser = await this.databaseService.updateUser(userId, data);
        return updatedUser;
    }

    /**
     * Delete user account
     */
    async deleteAccount(userId: string, password: string): Promise<void> {
        const user = await this.databaseService.findUserById(userId, true);
        if (!user || !user.password) {
            throw Errors.notFound("User");
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            throw Errors.unauthorized("Invalid password");
        }

        // Delete user and all related data
        await this.databaseService.deleteUser(userId);
    }

    /**
     * Check if username is available
     */
    async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
        const user = await this.databaseService.findUserByUsername(username);
        if (!user) return true;
        if (excludeUserId && user.id === excludeUserId) return true;
        return false;
    }

    /**
     * OAuth login/register
     */
    async oauthLogin(
        provider: string,
        profile: any
    ): Promise<{
        user: User;
        accessToken: string;
        refreshToken: string;
        isNewUser: boolean;
    }> {
        // Check if user exists with this OAuth profile
        let user = await this.databaseService.findUserByOAuth(provider, profile.id);
        let isNewUser = false;

        if (!user) {
            // Check if email already exists
            if (profile.email) {
                user = await this.findUserByEmail(profile.email);
                if (user) {
                    // Link OAuth account to existing user
                    await this.databaseService.linkOAuthAccount(user.id, provider, profile.id);
                }
            }

            if (!user) {
                // Create new user
                user = await this.databaseService.createUser({
                    email: profile.email || `${provider}_${profile.id}@oauth.local`,
                    username: profile.username || profile.displayName || `${provider}_user_${profile.id}`,
                    emailVerified: profile.emailVerified || false,
                    role: "user",
                    oauthProvider: provider,
                    oauthId: profile.id,
                });
                isNewUser = true;
            }
        }

        // Generate tokens
        const { accessToken, refreshToken } = await this.generateTokens(user);

        return {
            user,
            accessToken,
            refreshToken,
            isNewUser,
        };
    }
}
