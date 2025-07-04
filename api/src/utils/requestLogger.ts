import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";

/**
 * Request logger middleware
 * Logs incoming requests with relevant details
 */
export async function requestLogger(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
): Promise<void> {
    // Start timer for response time
    const start = Date.now();

    // Log request details
    request.log.info({
        request: {
            id: request.id,
            method: request.method,
            url: request.url,
            query: request.query,
            params: request.params,
            headers: sanitizeHeaders(request.headers),
            ip: request.ip,
            userAgent: request.headers["user-agent"],
        },
    });

    // Add response time header
    reply.header("X-Response-Time", `${Date.now() - start}ms`);

    // Log response on send
    reply.addHook("onSend", async (request, reply, payload) => {
        const responseTime = Date.now() - start;

        request.log.info({
            response: {
                id: request.id,
                statusCode: reply.statusCode,
                responseTime: `${responseTime}ms`,
                headers: reply.getHeaders(),
            },
        });

        // Log slow requests
        if (responseTime > 1000) {
            request.log.warn({
                message: "Slow request detected",
                request: {
                    id: request.id,
                    method: request.method,
                    url: request.url,
                    responseTime: `${responseTime}ms`,
                },
            });
        }

        return payload;
    });

    done();
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key", "x-auth-token"];

    sensitiveHeaders.forEach((header) => {
        if (sanitized[header]) {
            sanitized[header] = "[REDACTED]";
        }
    });

    return sanitized;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Performance monitoring hook
 */
export async function performanceMonitor(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const start = process.hrtime.bigint();

    reply.addHook("onSend", async (request, reply, payload) => {
        const end = process.hrtime.bigint();
        const responseTime = Number(end - start) / 1000000; // Convert to milliseconds

        // Add performance metrics
        reply.header("Server-Timing", `total;dur=${responseTime}`);

        // Log performance metrics
        if (responseTime > 100) {
            request.log.debug({
                performance: {
                    route: request.routerPath,
                    method: request.method,
                    responseTime: `${responseTime.toFixed(2)}ms`,
                    memoryUsage: process.memoryUsage(),
                },
            });
        }

        return payload;
    });
}

/**
 * Request ID generator
 */
export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log route registration
 */
export function logRouteRegistration(routePath: string, methods: string[]): void {
    console.log(`✅ Route registered: ${methods.join(", ")} ${routePath}`);
}
