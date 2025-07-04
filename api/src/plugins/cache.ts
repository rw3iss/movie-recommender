import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { createHash } from "crypto";

/**
 * Cache options interface
 */
interface CacheOptions {
    ttl?: number; // Time to live in seconds
    varyBy?: string[]; // Request properties to vary cache by
    tags?: string[]; // Cache tags for invalidation
}

/**
 * Extend Fastify interfaces
 */
declare module "fastify" {
    interface FastifyInstance {
        cache: {
            get: (key: string) => Promise<any>;
            set: (key: string, value: any, ttl?: number) => Promise<void>;
            del: (key: string) => Promise<void>;
            delByPattern: (pattern: string) => Promise<void>;
            delByTags: (tags: string[]) => Promise<void>;
            generateKey: (request: FastifyRequest, options?: CacheOptions) => string;
        };
    }

    interface FastifyReply {
        cache: (options?: CacheOptions) => FastifyReply;
        noCache: () => FastifyReply;
    }
}

/**
 * Cache plugin
 * Provides caching functionality using Redis or in-memory cache
 */
async function cachePlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
    const defaultTTL = 3600; // 1 hour default
    const cacheTagMap = new Map<string, Set<string>>(); // tag -> keys mapping

    /**
     * In-memory cache fallback
     */
    const memoryCache = new Map<string, { value: any; expires: number }>();

    /**
     * Get from cache
     */
    async function get(key: string): Promise<any> {
        try {
            if (fastify.redis) {
                const value = await fastify.redis.get(key);
                return value ? JSON.parse(value) : null;
            } else {
                // Use in-memory cache
                const cached = memoryCache.get(key);
                if (cached && cached.expires > Date.now()) {
                    return cached.value;
                } else if (cached) {
                    memoryCache.delete(key);
                }
                return null;
            }
        } catch (error) {
            fastify.log.error("Cache get error:", error);
            return null;
        }
    }

    /**
     * Set in cache
     */
    async function set(key: string, value: any, ttl: number = defaultTTL): Promise<void> {
        try {
            if (fastify.redis) {
                await fastify.redis.setex(key, ttl, JSON.stringify(value));
            } else {
                // Use in-memory cache
                memoryCache.set(key, {
                    value,
                    expires: Date.now() + ttl * 1000,
                });
            }
        } catch (error) {
            fastify.log.error("Cache set error:", error);
        }
    }

    /**
     * Delete from cache
     */
    async function del(key: string): Promise<void> {
        try {
            if (fastify.redis) {
                await fastify.redis.del(key);
            } else {
                memoryCache.delete(key);
            }
        } catch (error) {
            fastify.log.error("Cache delete error:", error);
        }
    }

    /**
     * Delete by pattern
     */
    async function delByPattern(pattern: string): Promise<void> {
        try {
            if (fastify.redis) {
                const keys = await fastify.redis.keys(pattern);
                if (keys.length > 0) {
                    await fastify.redis.del(...keys);
                }
            } else {
                // For in-memory cache, use regex
                const regex = new RegExp(pattern.replace("*", ".*"));
                for (const key of memoryCache.keys()) {
                    if (regex.test(key)) {
                        memoryCache.delete(key);
                    }
                }
            }
        } catch (error) {
            fastify.log.error("Cache delete by pattern error:", error);
        }
    }

    /**
     * Delete by tags
     */
    async function delByTags(tags: string[]): Promise<void> {
        try {
            const keysToDelete = new Set<string>();

            for (const tag of tags) {
                const keys = cacheTagMap.get(tag);
                if (keys) {
                    keys.forEach((key) => keysToDelete.add(key));
                }
            }

            for (const key of keysToDelete) {
                await del(key);
            }

            // Clean up tag map
            for (const tag of tags) {
                cacheTagMap.delete(tag);
            }
        } catch (error) {
            fastify.log.error("Cache delete by tags error:", error);
        }
    }

    /**
     * Generate cache key
     */
    function generateKey(request: FastifyRequest, options: CacheOptions = {}): string {
        const parts = [request.method, request.routerPath || request.url];

        // Add vary by parameters
        if (options.varyBy) {
            options.varyBy.forEach((param) => {
                if (param === "query" && request.query) {
                    parts.push(JSON.stringify(sortObject(request.query)));
                } else if (param === "params" && request.params) {
                    parts.push(JSON.stringify(sortObject(request.params)));
                } else if (param === "user" && request.user) {
                    parts.push(request.user.userId);
                } else if (param === "headers" && request.headers) {
                    parts.push(request.headers["accept-language"] || "en");
                }
            });
        }

        const hash = createHash("md5").update(parts.join(":")).digest("hex");
        return `cache:${hash}`;
    }

    /**
     * Sort object keys for consistent hashing
     */
    function sortObject(obj: any): any {
        if (typeof obj !== "object" || obj === null) return obj;

        if (Array.isArray(obj)) {
            return obj.map(sortObject);
        }

        return Object.keys(obj)
            .sort()
            .reduce((sorted: any, key) => {
                sorted[key] = sortObject(obj[key]);
                return sorted;
            }, {});
    }

    /**
     * Cache decorator
     */
    fastify.decorate("cache", {
        get,
        set,
        del,
        delByPattern,
        delByTags,
        generateKey,
    });

    /**
     * Reply cache decorator
     */
    fastify.decorateReply("cache", function (this: FastifyReply, options: CacheOptions = {}) {
        const reply = this;
        const request = reply.request;
        const key = generateKey(request, options);

        // Store options for later use
        (reply as any)._cacheOptions = { key, ...options };

        return reply;
    });

    /**
     * Reply no-cache decorator
     */
    fastify.decorateReply("noCache", function (this: FastifyReply) {
        this.header("Cache-Control", "no-store, no-cache, must-revalidate");
        this.header("Pragma", "no-cache");
        this.header("Expires", "0");
        return this;
    });

    /**
     * Hook to check cache before handler
     */
    fastify.addHook("onRequest", async (request, reply) => {
        // Skip cache for non-GET requests
        if (request.method !== "GET") return;

        // Check if route has cache options
        const routeOptions = request.routeOptions;
        if (!routeOptions || !routeOptions.config || !routeOptions.config.cache) return;

        const cacheOptions = routeOptions.config.cache as CacheOptions;
        const key = generateKey(request, cacheOptions);

        const cached = await get(key);
        if (cached) {
            reply.header("X-Cache", "HIT");
            reply.header("X-Cache-Key", key);
            reply.send(cached);
        }
    });

    /**
     * Hook to cache response
     */
    fastify.addHook("onSend", async (request, reply, payload) => {
        // Check if caching is enabled for this reply
        const cacheOptions = (reply as any)._cacheOptions;
        if (!cacheOptions) return payload;

        // Only cache successful responses
        if (reply.statusCode >= 200 && reply.statusCode < 300) {
            const { key, ttl, tags } = cacheOptions;

            // Store in cache
            await set(key, payload, ttl);

            // Update tag map
            if (tags && tags.length > 0) {
                for (const tag of tags) {
                    if (!cacheTagMap.has(tag)) {
                        cacheTagMap.set(tag, new Set());
                    }
                    cacheTagMap.get(tag)!.add(key);
                }
            }

            reply.header("X-Cache", "MISS");
            reply.header("X-Cache-Key", key);
            if (ttl) {
                reply.header("X-Cache-TTL", ttl.toString());
            }
        }

        return payload;
    });

    /**
     * Periodic cleanup for in-memory cache
     */
    if (!fastify.redis) {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of memoryCache.entries()) {
                if (value.expires < now) {
                    memoryCache.delete(key);
                }
            }
        }, 60000); // Clean up every minute
    }
}

export default fp(cachePlugin, {
    name: "cache-plugin",
    dependencies: [],
});
