import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    code?: string;

    constructor(message: string, statusCode: number = 500, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handler for Fastify
 * Handles both operational and programming errors
 */
export async function errorHandler(
    error: FastifyError | AppError | Error,
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Log error details
    request.log.error({
        err: error,
        request: {
            id: request.id,
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query,
            headers: request.headers,
        },
    });

    // Determine if error is operational
    const isOperational = (error as AppError).isOperational || false;

    // Get status code
    let statusCode = 500;
    if ("statusCode" in error && typeof error.statusCode === "number") {
        statusCode = error.statusCode;
    } else if ("code" in error) {
        // Handle specific error codes
        switch (error.code) {
            case "FST_JWT_NO_AUTHORIZATION_IN_HEADER":
            case "FST_JWT_AUTHORIZATION_TOKEN_INVALID":
                statusCode = 401;
                break;
            case "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED":
                statusCode = 401;
                break;
            case "VALIDATION_ERROR":
                statusCode = 400;
                break;
            case "NOT_FOUND":
                statusCode = 404;
                break;
            case "FORBIDDEN":
                statusCode = 403;
                break;
            case "CONFLICT":
                statusCode = 409;
                break;
            case "RATE_LIMITED":
                statusCode = 429;
                break;
            default:
                statusCode = 500;
        }
    }

    // Prepare error response
    const errorResponse: any = {
        statusCode,
        error: getErrorName(statusCode),
        message: error.message || "Internal Server Error",
        timestamp: new Date().toISOString(),
        path: request.url,
    };

    // Add request ID for tracking
    if (request.id) {
        errorResponse.requestId = request.id;
    }

    // Add validation errors if present
    if ("validation" in error && error.validation) {
        errorResponse.validation = error.validation;
    }

    // Add error code if present
    if ("code" in error && error.code) {
        errorResponse.code = error.code;
    }

    // In development, add stack trace
    if (process.env.NODE_ENV === "development" && !isOperational) {
        errorResponse.stack = error.stack;
    }

    // Send error response
    reply.status(statusCode).send(errorResponse);
}

/**
 * Get standard error name for status code
 */
function getErrorName(statusCode: number): string {
    const errorNames: Record<number, string> = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        409: "Conflict",
        422: "Unprocessable Entity",
        429: "Too Many Requests",
        500: "Internal Server Error",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
    };

    return errorNames[statusCode] || "Error";
}

/**
 * Common error creators
 */
export const Errors = {
    badRequest: (message: string = "Bad Request") => new AppError(message, 400, "BAD_REQUEST"),

    unauthorized: (message: string = "Unauthorized") => new AppError(message, 401, "UNAUTHORIZED"),

    forbidden: (message: string = "Forbidden") => new AppError(message, 403, "FORBIDDEN"),

    notFound: (resource: string = "Resource") => new AppError(`${resource} not found`, 404, "NOT_FOUND"),

    conflict: (message: string = "Conflict") => new AppError(message, 409, "CONFLICT"),

    validation: (message: string = "Validation Error", details?: any) => {
        const error = new AppError(message, 400, "VALIDATION_ERROR");
        if (details) {
            (error as any).validation = details;
        }
        return error;
    },

    internal: (message: string = "Internal Server Error") => new AppError(message, 500, "INTERNAL_ERROR"),

    serviceUnavailable: (message: string = "Service Unavailable") => new AppError(message, 503, "SERVICE_UNAVAILABLE"),
};

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(fn: Function) {
    return (request: FastifyRequest, reply: FastifyReply) => {
        Promise.resolve(fn(request, reply)).catch((error) => {
            errorHandler(error, request, reply);
        });
    };
}
