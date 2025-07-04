import { CacheServiceInterface, CacheEntry } from "@/types";

/**
 * Cache Service using IndexedDB for persistent storage
 * Follows Single Responsibility Principle - only handles caching
 */
export class CacheService implements CacheServiceInterface {
    private dbName: string = "MovieAppCache";
    private dbVersion: number = 1;
    private storeName: string = "cache_entries";
    private db: IDBDatabase | null = null;
    private defaultTTL: number = 1000 * 60 * 60; // 1 hour default

    constructor() {
        this.initializeDB();
    }

    private async initializeDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error("Failed to open IndexedDB"));
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: "key" });
                    store.createIndex("timestamp", "timestamp", { unique: false });
                }
            };
        });
    }

    private async ensureDB(): Promise<IDBDatabase> {
        if (!this.db) {
            await this.initializeDB();
        }
        if (!this.db) {
            throw new Error("Database not available");
        }
        return this.db;
    }

    private generateKey(endpoint: string, params?: Record<string, any>): string {
        const baseKey = endpoint;
        if (!params) return baseKey;

        // Sort params for consistent key generation
        const sortedParams = Object.keys(params)
            .sort()
            .map((key) => `${key}=${params[key]}`)
            .join("&");

        return `${baseKey}?${sortedParams}`;
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], "readonly");
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);

                request.onerror = () => reject(request.error);

                request.onsuccess = () => {
                    const entry: CacheEntry<T> | undefined = request.result;

                    if (!entry) {
                        resolve(null);
                        return;
                    }

                    // Check if entry has expired
                    const now = Date.now();
                    if (entry.timestamp + this.defaultTTL < now) {
                        // Entry expired, delete it and return null
                        this.delete(key);
                        resolve(null);
                        return;
                    }

                    resolve(entry.data);
                };
            });
        } catch (error) {
            console.warn("Cache get failed, returning null:", error);
            return null;
        }
    }

    async set<T>(key: string, data: T, ttl?: number): Promise<void> {
        try {
            const db = await this.ensureDB();

            const entry: CacheEntry<T> = {
                key,
                data,
                timestamp: Date.now(),
            };

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], "readwrite");
                const store = transaction.objectStore(this.storeName);
                const request = store.put(entry);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            console.warn("Cache set failed:", error);
            // Don't throw, caching is not critical
        }
    }

    async delete(key: string): Promise<void> {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], "readwrite");
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(key);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            console.warn("Cache delete failed:", error);
        }
    }

    async clear(): Promise<void> {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], "readwrite");
                const store = transaction.objectStore(this.storeName);
                const request = store.clear();

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            console.warn("Cache clear failed:", error);
        }
    }

    // Convenience methods for API caching
    async getFromAPI<T>(endpoint: string, params?: Record<string, any>, ttl?: number): Promise<T | null> {
        const key = this.generateKey(endpoint, params);
        return this.get<T>(key);
    }

    async setFromAPI<T>(
        endpoint: string,
        params: Record<string, any> | undefined,
        data: T,
        ttl?: number
    ): Promise<void> {
        const key = this.generateKey(endpoint, params);
        return this.set(key, data, ttl);
    }

    // Cleanup expired entries
    async cleanup(): Promise<void> {
        try {
            const db = await this.ensureDB();
            const now = Date.now();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], "readwrite");
                const store = transaction.objectStore(this.storeName);
                const index = store.index("timestamp");
                const request = index.openCursor();

                request.onerror = () => reject(request.error);

                request.onsuccess = () => {
                    const cursor = request.result;
                    if (cursor) {
                        const entry: CacheEntry<any> = cursor.value;

                        // Delete expired entries
                        if (entry.timestamp + this.defaultTTL < now) {
                            cursor.delete();
                        }

                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
            });
        } catch (error) {
            console.warn("Cache cleanup failed:", error);
        }
    }

    // Get cache statistics
    async getStats(): Promise<{ totalEntries: number; totalSize: number }> {
        try {
            const db = await this.ensureDB();

            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], "readonly");
                const store = transaction.objectStore(this.storeName);
                const request = store.count();

                request.onerror = () => reject(request.error);

                request.onsuccess = () => {
                    resolve({
                        totalEntries: request.result,
                        totalSize: 0, // IndexedDB doesn't provide easy size calculation
                    });
                };
            });
        } catch (error) {
            console.warn("Cache stats failed:", error);
            return { totalEntries: 0, totalSize: 0 };
        }
    }
}
