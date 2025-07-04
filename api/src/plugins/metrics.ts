import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

/**
 * Metrics interface
 */
interface Metrics {
    requests: {
        total: number;
        success: number;
        error: number;
        byMethod: Record<string, number>;
        byRoute: Record<string, number>;
        byStatus: Record<number, number>;
    };
    performance: {
        responseTime: {
            total: number;
            count: number;
            min: number;
            max: number;
            avg: number;
        };
        byRoute: Record<
            string,
            {
                total: number;
                count: number;
                min: number;
                max: number;
                avg: number;
            }
        >;
    };
    errors: {
        total: number;
        byType: Record<string, number>;
        byRoute: Record<string, number>;
    };
    system: {
        memory: NodeJS.MemoryUsage;
        uptime: number;
        cpuUsage: NodeJS.CpuUsage;
    };
}

/**
 * Extend Fastify interfaces
 */
declare module "fastify" {
    interface FastifyInstance {
        metrics: {
            get: () => Metrics;
            increment: (metric: string, value?: number) => void;
            timing: (metric: string, value: number) => void;
            gauge: (metric: string, value: number) => void;
            reset: () => void;
        };
    }
}

/**
 * Metrics plugin
 * Collects and exposes application metrics
 */
async function metricsPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
    // Initialize metrics storage
    const metrics: Metrics = {
        requests: {
            total: 0,
            success: 0,
            error: 0,
            byMethod: {},
            byRoute: {},
            byStatus: {},
        },
        performance: {
            responseTime: {
                total: 0,
                count: 0,
                min: Infinity,
                max: 0,
                avg: 0,
            },
            byRoute: {},
        },
        errors: {
            total: 0,
            byType: {},
            byRoute: {},
        },
        system: {
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            cpuUsage: process.cpuUsage(),
        },
    };

    /**
     * Update response time metrics
     */
    function updateResponseTime(route: string, time: number): void {
        // Overall metrics
        metrics.performance.responseTime.total += time;
        metrics.performance.responseTime.count += 1;
        metrics.performance.responseTime.min = Math.min(metrics.performance.responseTime.min, time);
        metrics.performance.responseTime.max = Math.max(metrics.performance.responseTime.max, time);
        metrics.performance.responseTime.avg =
            metrics.performance.responseTime.total / metrics.performance.responseTime.count;

        // Per-route metrics
        if (!metrics.performance.byRoute[route]) {
            metrics.performance.byRoute[route] = {
                total: 0,
                count: 0,
                min: Infinity,
                max: 0,
                avg: 0,
            };
        }

        const routeMetrics = metrics.performance.byRoute[route];
        routeMetrics.total += time;
        routeMetrics.count += 1;
        routeMetrics.min = Math.min(routeMetrics.min, time);
        routeMetrics.max = Math.max(routeMetrics.max, time);
        routeMetrics.avg = routeMetrics.total / routeMetrics.count;
    }

    /**
     * Metrics interface
     */
    const metricsInterface = {
        get: () => {
            // Update system metrics
            metrics.system = {
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                cpuUsage: process.cpuUsage(),
            };
            return metrics;
        },

        increment: (metric: string, value: number = 1) => {
            const parts = metric.split(".");
            let current: any = metrics;

            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }

            const key = parts[parts.length - 1];
            if (typeof current[key] === "number") {
                current[key] += value;
            } else {
                current[key] = value;
            }
        },

        timing: (metric: string, value: number) => {
            updateResponseTime(metric, value);
        },

        gauge: (metric: string, value: number) => {
            const parts = metric.split(".");
            let current: any = metrics;

            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }

            current[parts[parts.length - 1]] = value;
        },

        reset: () => {
            metrics.requests = {
                total: 0,
                success: 0,
                error: 0,
                byMethod: {},
                byRoute: {},
                byStatus: {},
            };
            metrics.performance = {
                responseTime: {
                    total: 0,
                    count: 0,
                    min: Infinity,
                    max: 0,
                    avg: 0,
                },
                byRoute: {},
            };
            metrics.errors = {
                total: 0,
                byType: {},
                byRoute: {},
            };
        },
    };

    // Decorate fastify instance
    fastify.decorate("metrics", metricsInterface);

    // Hook to track requests
    fastify.addHook("onRequest", async (request, reply) => {
        // Track request start time
        (request as any)._startTime = process.hrtime.bigint();

        // Increment request counters
        metrics.requests.total++;

        const method = request.method;
        metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;
    });

    // Hook to track responses
    fastify.addHook("onResponse", async (request, reply) => {
        // Calculate response time
        const startTime = (request as any)._startTime;
        if (startTime) {
            const endTime = process.hrtime.bigint();
            const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

            const route = request.routerPath || request.url;
            updateResponseTime(route, responseTime);
        }

        // Track status codes
        const statusCode = reply.statusCode;
        metrics.requests.byStatus[statusCode] = (metrics.requests.byStatus[statusCode] || 0) + 1;

        // Track route
        const route = request.routerPath || request.url;
        metrics.requests.byRoute[route] = (metrics.requests.byRoute[route] || 0) + 1;

        // Track success/error
        if (statusCode >= 200 && statusCode < 400) {
            metrics.requests.success++;
        } else {
            metrics.requests.error++;
        }
    });

    // Hook to track errors
    fastify.addHook("onError", async (request, reply, error) => {
        metrics.errors.total++;

        // Track by error type
        const errorType = error.name || "UnknownError";
        metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;

        // Track by route
        const route = request.routerPath || request.url;
        metrics.errors.byRoute[route] = (metrics.errors.byRoute[route] || 0) + 1;
    });

    // Add metrics endpoint
    fastify.get("/metrics", async (request, reply) => {
        const currentMetrics = metricsInterface.get();

        // Format as Prometheus metrics if requested
        if (request.headers.accept === "text/plain") {
            const prometheusMetrics = formatPrometheusMetrics(currentMetrics);
            reply.type("text/plain").send(prometheusMetrics);
        } else {
            reply.send(currentMetrics);
        }
    });

    // Add health metrics endpoint
    fastify.get("/metrics/health", async (request, reply) => {
        const health = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            pid: process.pid,
            version: process.version,
            env: process.env.NODE_ENV,
        };
        reply.send(health);
    });
}

/**
 * Format metrics in Prometheus format
 */
function formatPrometheusMetrics(metrics: Metrics): string {
    const lines: string[] = [];

    // Request metrics
    lines.push("# HELP http_requests_total Total number of HTTP requests");
    lines.push("# TYPE http_requests_total counter");
    lines.push(`http_requests_total ${metrics.requests.total}`);

    // Request by method
    lines.push("# HELP http_requests_method_total Total number of HTTP requests by method");
    lines.push("# TYPE http_requests_method_total counter");
    Object.entries(metrics.requests.byMethod).forEach(([method, count]) => {
        lines.push(`http_requests_method_total{method="${method}"} ${count}`);
    });

    // Request by status
    lines.push("# HELP http_requests_status_total Total number of HTTP requests by status");
    lines.push("# TYPE http_requests_status_total counter");
    Object.entries(metrics.requests.byStatus).forEach(([status, count]) => {
        lines.push(`http_requests_status_total{status="${status}"} ${count}`);
    });

    // Response time
    lines.push("# HELP http_response_time_milliseconds Response time in milliseconds");
    lines.push("# TYPE http_response_time_milliseconds summary");
    lines.push(`http_response_time_milliseconds_sum ${metrics.performance.responseTime.total}`);
    lines.push(`http_response_time_milliseconds_count ${metrics.performance.responseTime.count}`);
    lines.push(`http_response_time_milliseconds{quantile="0"} ${metrics.performance.responseTime.min}`);
    lines.push(`http_response_time_milliseconds{quantile="1"} ${metrics.performance.responseTime.max}`);

    // Error metrics
    lines.push("# HELP http_errors_total Total number of errors");
    lines.push("# TYPE http_errors_total counter");
    lines.push(`http_errors_total ${metrics.errors.total}`);

    // Memory usage
    lines.push("# HELP nodejs_memory_usage_bytes Memory usage in bytes");
    lines.push("# TYPE nodejs_memory_usage_bytes gauge");
    Object.entries(metrics.system.memory).forEach(([type, bytes]) => {
        lines.push(`nodejs_memory_usage_bytes{type="${type}"} ${bytes}`);
    });

    // Uptime
    lines.push("# HELP nodejs_uptime_seconds Process uptime in seconds");
    lines.push("# TYPE nodejs_uptime_seconds gauge");
    lines.push(`nodejs_uptime_seconds ${metrics.system.uptime}`);

    return lines.join("\n");
}

export default fp(metricsPlugin, {
    name: "metrics-plugin",
    dependencies: [],
});
