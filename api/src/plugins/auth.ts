import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { AppError } from "../utils/errorHandler";

/**
 * JWT payload interface
 */
export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}

/**
 * Extend FastifyRequest to include user
 */
declare module "fastify" {
    interface FastifyRequest {
        user?: JWTPayload;
    }

    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        authenticateOptional: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        authorize: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

/**
 * Authentication plugin
 * Provides JWT authentication and authorization decorators
 */
async function authPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
    /**
     * Authenticate decorator - requires valid JWT
     */
    fastify.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            // First try to get token from Authorization header
            let token: string | undefined;

            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }

            // If no token in header, check cookies
            if (!token && request.cookies && request.cookies.token) {
                token = request.cookies.token;
            }

            if (!token) {
                throw new AppError("No authentication token provided", 401, "NO_TOKEN");
            }

            // Verify token
            const decoded = await request.jwtVerify();
            request.user = decoded as JWTPayload;

            // Check if token is expired
            if (request.user.exp && request.user.exp * 1000 < Date.now()) {
                throw new AppError("Token has expired", 401, "TOKEN_EXPIRED");
            }
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            // Handle JWT specific errors
            if (error instanceof Error) {
                if (error.message.includes("expired")) {
                    throw new AppError("Token has expired", 401, "TOKEN_EXPIRED");
                } else if (error.message.includes("invalid")) {
                    throw new AppError("Invalid token", 401, "INVALID_TOKEN");
                }
            }

            throw new AppError("Authentication failed", 401, "AUTH_FAILED");
        }
    });

    /**
     * Optional authenticate decorator - doesn't require JWT but adds user if present
     */
    fastify.decorate("authenticateOptional", async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            let token: string | undefined;

            const authHeader = request.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }

            if (!token && request.cookies && request.cookies.token) {
                token = request.cookies.token;
            }

            if (token) {
                const decoded = await request.jwtVerify();
                request.user = decoded as JWTPayload;
            }
        } catch (error) {
            // Silently ignore authentication errors for optional auth
            request.log.debug("Optional authentication failed:", error);
        }
    });

    /**
     * Authorization decorator - checks user roles
     */
    fastify.decorate("authorize", function (roles: string[]) {
        return async function (request: FastifyRequest, reply: FastifyReply) {
            if (!request.user) {
                throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
            }

            if (!roles.includes(request.user.role)) {
                throw new AppError(
                    `Insufficient permissions. Required roles: ${roles.join(", ")}`,
                    403,
                    "INSUFFICIENT_PERMISSIONS"
                );
            }
        };
    });

    /**
     * Helper to generate JWT tokens
     */
    fastify.decorate("generateToken", function (payload: Omit<JWTPayload, "iat" | "exp">) {
        return fastify.jwt.sign(payload);
    });

    /**
     * Helper to generate refresh tokens
     */
    fastify.decorate("generateRefreshToken", function (payload: Omit<JWTPayload, "iat" | "exp">) {
        return fastify.jwt.sign(payload, { expiresIn: "30d" });
    });

    /**
     * Hook to add user info to request logs
     */
    fastify.addHook("onRequest", async (request, reply) => {
        if (request.user) {
            request.log = request.log.child({ userId: request.user.userId });
        }
    });
}

export default fp(authPlugin, {
    name: "auth-plugin",
    dependencies: ["@fastify/jwt", "@fastify/cookie"],
});
