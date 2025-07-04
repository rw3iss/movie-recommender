// src/server.ts
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import postgres from "@fastify/postgres";
import redis from "@fastify/redis";
import multipart from "@fastify/multipart";
import compress from "@fastify/compress";
import etag from "@fastify/etag";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

// Import routes
import { movieRoutes } from "./routes/movieRoutes";
import { actorRoutes } from "./routes/actorRoutes";
import { directorRoutes } from "./routes/directorRoutes";
import { searchRoutes } from "./routes/searchRoutes";
import { listRoutes } from "./routes/listRoutes";
import { userRoutes } from "./routes/userRoutes";
import { authRoutes } from "./routes/authRoutes";
import { healthRoutes } from "./routes/healthRoutes";

// Import configurations
import { config } from "./config";
import { errorHandler } from "./utils/errorHandler";
import { requestLogger } from "./utils/requestLogger";
import { authPlugin } from "./plugins/auth";
import { cachePlugin } from "./plugins/cache";
import { metricsPlugin } from "./plugins/metrics";

// Create Fastify instance with TypeBox provider
const fastify: FastifyInstance = Fastify({
    logger: {
        level: config.LOG_LEVEL,
        prettyPrint: config.NODE_ENV === "development",
    },
    trustProxy: true,
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "reqId",
    disableRequestLogging: false,
    bodyLimit: 10485760, // 10MB
}).withTypeProvider<TypeBoxTypeProvider>();

// Register plugins
async function registerPlugins() {
    // Security plugins
    await fastify.register(helmet, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "https:", "data:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
    });

    // CORS configuration
    await fastify.register(cors, {
        origin: (origin, cb) => {
            const allowedOrigins = config.ALLOWED_ORIGINS.split(",");
            if (!origin || allowedOrigins.includes(origin)) {
                cb(null, true);
            } else {
                cb(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
        exposedHeaders: ["X-Total-Count", "X-Page-Count"],
    });

    // Rate limiting
    await fastify.register(rateLimit, {
        global: true,
        max: 100,
        timeWindow: "1 minute",
        cache: 10000,
        whitelist: ["127.0.0.1"],
        redis: config.REDIS_URL ? fastify.redis : undefined,
        skipSuccessfulRequests: false,
        keyGenerator: (request) => {
            return request.headers["x-forwarded-for"] || request.headers["x-real-ip"] || request.ip;
        },
        errorResponseBuilder: (request, context) => {
            return {
                statusCode: 429,
                error: "Too Many Requests",
                message: `Rate limit exceeded, retry in ${context.after}`,
                date: Date.now(),
                expiresIn: context.ttl,
            };
        },
    });

    // JWT authentication
    await fastify.register(jwt, {
        secret: config.JWT_SECRET,
        cookie: {
            cookieName: "token",
            signed: false,
        },
        sign: {
            expiresIn: "7d",
        },
    });

    await fastify.register(cookie, {
        secret: config.COOKIE_SECRET,
        parseOptions: {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        },
    });

    // Database connections
    await fastify.register(postgres, {
        connectionString: config.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    if (config.REDIS_URL) {
        await fastify.register(redis, {
            url: config.REDIS_URL,
            closeClient: true,
        });
    }

    // Other plugins
    await fastify.register(multipart, {
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB
            files: 1,
        },
    });

    await fastify.register(compress, {
        global: true,
        threshold: 1024,
        encodings: ["gzip", "deflate"],
    });

    await fastify.register(etag);

    // Custom plugins
    await fastify.register(authPlugin);
    await fastify.register(cachePlugin);
    await fastify.register(metricsPlugin);
}

// Register routes
async function registerRoutes() {
    // API versioning
    await fastify.register(
        async function apiV1(fastify) {
            // Health check routes
            await fastify.register(healthRoutes, { prefix: "/health" });

            // Authentication routes
            await fastify.register(authRoutes, { prefix: "/auth" });

            // Main API routes
            await fastify.register(movieRoutes, { prefix: "/movies" });
            await fastify.register(actorRoutes, { prefix: "/actors" });
            await fastify.register(directorRoutes, { prefix: "/directors" });
            await fastify.register(searchRoutes, { prefix: "/search" });
            await fastify.register(listRoutes, { prefix: "/lists" });
            await fastify.register(userRoutes, { prefix: "/users" });
        },
        { prefix: "/api/v1" }
    );

    // Root route
    fastify.get("/", async (request, reply) => {
        return {
            name: "Movie Recommendation API",
            version: "1.0.0",
            status: "operational",
            endpoints: {
                health: "/api/v1/health",
                docs: "/api/v1/docs",
                movies: "/api/v1/movies",
                actors: "/api/v1/actors",
                directors: "/api/v1/directors",
                search: "/api/v1/search",
                lists: "/api/v1/lists",
                users: "/api/v1/users",
            },
        };
    });

    // 404 handler
    fastify.setNotFoundHandler((request, reply) => {
        reply.status(404).send({
            statusCode: 404,
            error: "Not Found",
            message: `Route ${request.method}:${request.url} not found`,
        });
    });
}

// Setup hooks
function setupHooks() {
    // Request logging
    fastify.addHook("onRequest", requestLogger);

    // Add request ID to all responses
    fastify.addHook("onSend", async (request, reply, payload) => {
        reply.header("X-Request-ID", request.id);
        reply.header("X-Response-Time", reply.getResponseTime());
        return payload;
    });

    // Clean up resources
    fastify.addHook("onClose", async (instance) => {
        await instance.pg.end();
        if (instance.redis) {
            instance.redis.quit();
        }
    });
}

// Error handling
fastify.setErrorHandler(errorHandler);

// Graceful shutdown
async function gracefulShutdown() {
    console.log("Received shutdown signal, closing server gracefully...");

    try {
        await fastify.close();
        console.log("Server closed successfully");
        process.exit(0);
    } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
    }
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start server
async function start() {
    try {
        // Register all plugins and routes
        await registerPlugins();
        await registerRoutes();
        setupHooks();

        // Start listening
        await fastify.listen({
            port: config.PORT,
            host: config.HOST,
        });

        console.log(`
🎬 Movie Recommendation API Server
================================
Environment: ${config.NODE_ENV}
Server: http://${config.HOST}:${config.PORT}
API Base: http://${config.HOST}:${config.PORT}/api/v1
Database: ${config.DATABASE_URL ? "Connected" : "Not configured"}
Redis: ${config.REDIS_URL ? "Connected" : "Not configured"}
================================
    `);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Handle unhandled rejections
process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection:", err);
    process.exit(1);
});

// Start the server
start();

// Export for testing
export { fastify };
