/**
 * Cache service for managing application caching
 * Supports both Redis and in-memory caching
 */
export class CacheService {
    private memoryCache: Map<string, { data: any; expires: number }> = new Map();
    private defaultTTL: number = 3600; // 1 hour

    constructor(private redis?: any) {}

    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            if (this.redis) {
                const value = await this.redis.get(key);
                return value ? JSON.parse(value) : null;
            } else {
                const cached = this.memoryCache.get(key);
                if (cached && cached.expires > Date.now()) {
                    return cached.data;
                } else if (cached) {
                    this.memoryCache.delete(key);
                }
                return null;
            }
        } catch (error) {
            console.error("Cache get error:", error);
            return null;
        }
    }

    /**
     * Set value in cache
     */
    async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
        try {
            if (this.redis) {
                await this.redis.setex(key, ttl, JSON.stringify(value));
            } else {
                this.memoryCache.set(key, {
                    data: value,
                    expires: Date.now() + ttl * 1000,
                });
            }
        } catch (error) {
            console.error("Cache set error:", error);
        }
    }

    /**
     * Delete value from cache
     */
    async del(key: string): Promise<void> {
        try {
            if (this.redis) {
                await this.redis.del(key);
            } else {
                this.memoryCache.delete(key);
            }
        } catch (error) {
            console.error("Cache delete error:", error);
        }
    }

    /**
     * Delete multiple values by pattern
     */
    async delByPattern(pattern: string): Promise<void> {
        try {
            if (this.redis) {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            } else {
                const regex = new RegExp(pattern.replace("*", ".*"));
                for (const key of this.memoryCache.keys()) {
                    if (regex.test(key)) {
                        this.memoryCache.delete(key);
                    }
                }
            }
        } catch (error) {
            console.error("Cache delete by pattern error:", error);
        }
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        try {
            if (this.redis) {
                await this.redis.flushdb();
            } else {
                this.memoryCache.clear();
            }
        } catch (error) {
            console.error("Cache clear error:", error);
        }
    }

    /**
     * Get or set cache value
     */
    async getOrSet<T>(key: string, factory: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const value = await factory();
        await this.set(key, value, ttl);
        return value;
    }

    /**
     * Cache decorator for methods
     */
    cache(ttl: number = this.defaultTTL) {
        return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
            const method = descriptor.value;

            descriptor.value = async function (...args: any[]) {
                const key = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
                const cacheService = (this as any).cacheService || new CacheService();

                return cacheService.getOrSet(key, () => method.apply(this, args), ttl);
            };

            return descriptor;
        };
    }

    /**
     * Invalidate cache decorator
     */
    invalidate(patterns: string[]) {
        return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
            const method = descriptor.value;

            descriptor.value = async function (...args: any[]) {
                const result = await method.apply(this, args);
                const cacheService = (this as any).cacheService || new CacheService();

                for (const pattern of patterns) {
                    await cacheService.delByPattern(pattern);
                }

                return result;
            };

            return descriptor;
        };
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        size: number;
        memoryUsage?: number;
        hitRate?: number;
    }> {
        if (this.redis) {
            const info = await this.redis.info("memory");
            const dbSize = await this.redis.dbsize();
            return {
                size: dbSize,
                memoryUsage: parseInt(info.match(/used_memory:(\d+)/)?.[1] || "0"),
            };
        } else {
            return {
                size: this.memoryCache.size,
                memoryUsage: process.memoryUsage().heapUsed,
            };
        }
    }

    /**
     * Periodic cleanup for memory cache
     */
    startCleanup(interval: number = 60000): void {
        if (!this.redis) {
            setInterval(() => {
                const now = Date.now();
                for (const [key, value] of this.memoryCache.entries()) {
                    if (value.expires < now) {
                        this.memoryCache.delete(key);
                    }
                }
            }, interval);
        }
    }
}
