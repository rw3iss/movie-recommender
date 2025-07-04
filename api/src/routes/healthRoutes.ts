import { FastifyInstance, FastifyPluginOptions } from "fastify";

/**
 * Health check routes
 * Provides endpoints for monitoring application health
 */
export async function healthRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    /**
     * Basic health check
     * @route GET /api/v1/health
     */
    fastify.get("/", async (request, reply) => {
        reply.send({
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
        });
    });

    /**
     * Liveness probe for Kubernetes
     * @route GET /api/v1/health/live
     */
    fastify.get("/live", async (request, reply) => {
        reply.send({
            status: "alive",
            timestamp: new Date().toISOString(),
        });
    });

    /**
     * Readiness probe for Kubernetes
     * Checks if all services are ready
     * @route GET /api/v1/health/ready
     */
    fastify.get("/ready", {
        schema: {
            response: {
                200: {
                    type: "object",
                    properties: {
                        status: { type: "string", enum: ["ready", "not_ready"] },
                        timestamp: { type: "string" },
                        services: {
                            type: "object",
                            properties: {
                                database: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string" },
                                        latency: { type: "number" },
                                    },
                                },
                                redis: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string" },
                                        latency: { type: "number" },
                                    },
                                },
                                tmdb: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string" },
                                        latency: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
                503: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        timestamp: { type: "string" },
                        services: { type: "object" },
                        errors: {
                            type: "array",
                            items: { type: "string" },
                        },
                    },
                },
            },
        },
        handler: async (request, reply) => {
            const services: any = {};
            const errors: string[] = [];
            let isReady = true;

            // Check database
            try {
                const start = Date.now();
                await fastify.pg.query("SELECT 1");
                services.database = {
                    status: "healthy",
                    latency: Date.now() - start,
                };
            } catch (error) {
                services.database = { status: "unhealthy", error: error.message };
                errors.push("Database is not responding");
                isReady = false;
            }

            // Check Redis (if configured)
            if (fastify.redis) {
                try {
                    const start = Date.now();
                    await fastify.redis.ping();
                    services.redis = {
                        status: "healthy",
                        latency: Date.now() - start,
                    };
                } catch (error) {
                    services.redis = { status: "unhealthy", error: error.message };
                    errors.push("Redis is not responding");
                    // Redis is optional, so don't mark as not ready
                }
            } else {
                services.redis = { status: "not_configured" };
            }

            // Check TMDB API
            try {
                const start = Date.now();
                // Simple check - could be replaced with actual API call
                const tmdbHealthy = true; // Placeholder
                services.tmdb = {
                    status: tmdbHealthy ? "healthy" : "unhealthy",
                    latency: Date.now() - start,
                };
            } catch (error) {
                services.tmdb = { status: "unhealthy", error: error.message };
                // External service, don't mark as not ready
            }

            const response = {
                status: isReady ? "ready" : "not_ready",
                timestamp: new Date().toISOString(),
                services,
            };

            if (!isReady) {
                (response as any).errors = errors;
                reply.status(503).send(response);
            } else {
                reply.send(response);
            }
        },
    });

    /**
     * Detailed system information
     * @route GET /api/v1/health/info
     */
    fastify.get("/info", {
        preHandler: fastify.authenticate, // Require auth for detailed info
        handler: async (request, reply) => {
            const memoryUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();

            reply.send({
                application: {
                    name: "Movie Recommendation API",
                    version: process.env.npm_package_version || "1.0.0",
                    environment: process.env.NODE_ENV || "development",
                    node_version: process.version,
                    pid: process.pid,
                    uptime: process.uptime(),
                },
                system: {
                    platform: process.platform,
                    arch: process.arch,
                    cpus: require("os").cpus().length,
                    total_memory: require("os").totalmem(),
                    free_memory: require("os").freemem(),
                    load_average: require("os").loadavg(),
                },
                process: {
                    memory: {
                        rss: memoryUsage.rss,
                        heap_total: memoryUsage.heapTotal,
                        heap_used: memoryUsage.heapUsed,
                        external: memoryUsage.external,
                        array_buffers: memoryUsage.arrayBuffers,
                    },
                    cpu: {
                        user: cpuUsage.user,
                        system: cpuUsage.system,
                    },
                },
                timestamp: new Date().toISOString(),
            });
        },
    });
}
