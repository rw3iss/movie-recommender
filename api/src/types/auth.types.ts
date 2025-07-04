/**
 * Authentication-specific type definitions
 */

export interface RegisterBody {
    email: string;
    username: string;
    password: string;
}

export interface LoginBody {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface RefreshTokenBody {
    refreshToken: string;
}

export interface ResetPasswordBody {
    token: string;
    newPassword: string;
}

export interface ChangePasswordBody {
    currentPassword: string;
    newPassword: string;
}

export interface VerifyEmailBody {
    token: string;
}

export interface OAuth2CallbackQuery {
    code: string;
    state?: string;
    error?: string;
}

export interface AuthResponse {
    user: {
        id: string;
        email: string;
        username: string;
        emailVerified: boolean;
        role: string;
        createdAt: string;
    };
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface ForgotPasswordBody {
    email: string;
}

export interface OAuth2LoginQuery {
    provider: "google" | "facebook" | "github";
    redirectUrl?: string;
}
