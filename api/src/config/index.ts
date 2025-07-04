import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Application configuration
 * Centralizes all environment variables and configuration
 */
export const config = {
    // Server
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: parseInt(process.env.PORT || "3001", 10),
    HOST: process.env.HOST || "0.0.0.0",
    LOG_LEVEL: process.env.LOG_LEVEL || "info",

    // Database
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/movie_rec",
    DB_POOL_SIZE: parseInt(process.env.DB_POOL_SIZE || "20", 10),

    // Redis
    REDIS_URL: process.env.REDIS_URL,
    CACHE_TTL: parseInt(process.env.CACHE_TTL || "3600", 10), // 1 hour

    // JWT & Auth
    JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
    COOKIE_SECRET: process.env.COOKIE_SECRET || "your-cookie-secret-change-in-production",

    // TMDB API
    TMDB_API_KEY: process.env.TMDB_API_KEY || "5b713bae92d64cab53739587d0afc801",
    TMDB_READ_ACCESS_TOKEN:
        process.env.TMDB_READ_ACCESS_TOKEN ||
        "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1YjcxM2JhZTkyZDY0Y2FiNTM3Mzk1ODdkMGFmYzgwMSIsIm5iZiI6MTQ4ODkzMzU3NS42MjcsInN1YiI6IjU4YmY1MmM0OTI1MTQxNWYwMzAwMGQwOSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.5ri-EoSJsbktzJz_6KnTlJXlAulxTCQokqGLDhaF9-U",

    // Email
    EMAIL_SERVICE: process.env.EMAIL_SERVICE || "sendgrid",
    EMAIL_API_KEY: process.env.EMAIL_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM || "noreply@movierecommender.com",
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "Movie Recommender",

    // CORS
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001",

    // Rate Limiting
    RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || "1 minute",
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),

    // File Upload
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "5242880", 10), // 5MB
    ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/gif,image/webp",

    // External APIs
    IMDB_API_KEY: process.env.IMDB_API_KEY,
    OMDB_API_KEY: process.env.OMDB_API_KEY,

    // Feature Flags
    ENABLE_OAUTH: process.env.ENABLE_OAUTH === "true",
    ENABLE_EMAIL_VERIFICATION: process.env.ENABLE_EMAIL_VERIFICATION === "true",
    ENABLE_RECOMMENDATIONS: process.env.ENABLE_RECOMMENDATIONS !== "false",

    // OAuth Providers
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,

    // Application URLs
    APP_URL: process.env.APP_URL || "http://localhost:3000",
    API_URL: process.env.API_URL || "http://localhost:3001",

    // Recommendation Engine
    RECOMMENDATION_MIN_RATINGS: parseInt(process.env.RECOMMENDATION_MIN_RATINGS || "5", 10),
    RECOMMENDATION_CACHE_TTL: parseInt(process.env.RECOMMENDATION_CACHE_TTL || "86400", 10), // 24 hours

    // Analytics
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS === "true",
    ANALYTICS_KEY: process.env.ANALYTICS_KEY,

    // Development
    DEV_SEED_DATA: process.env.DEV_SEED_DATA === "true",
    DEV_LOG_SQL: process.env.DEV_LOG_SQL === "true",
};

// Validate required configuration
export function validateConfig(): void {
    const required = ["JWT_SECRET", "DATABASE_URL"];
    const missing = required.filter((key) => !config[key as keyof typeof config]);

    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(", ")}`);
    }

    // Validate in production
    if (config.NODE_ENV === "production") {
        if (config.JWT_SECRET === "your-secret-key-change-in-production") {
            throw new Error("JWT_SECRET must be changed in production");
        }
        if (!config.REDIS_URL) {
            console.warn("Redis is recommended in production for caching");
        }
    }
}
