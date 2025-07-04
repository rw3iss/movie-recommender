import { ApiServiceInterface, AppError } from "@/types";

/**
 * API Service following Single Responsibility Principle
 * Handles all HTTP communications with the backend
 */
export class ApiService implements ApiServiceInterface {
    private baseUrl: string;
    private defaultHeaders: Record<string, string>;

    constructor() {
        this.baseUrl = process.env.API_URL || "http://localhost:3001";
        this.defaultHeaders = {
            "Content-Type": "application/json",
            Accept: "application/json",
        };
    }

    async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
        const url = new URL(endpoint, this.baseUrl);

        if (params) {
            Object.keys(params).forEach((key) => {
                if (params[key] !== undefined && params[key] !== null) {
                    url.searchParams.append(key, String(params[key]));
                }
            });
        }

        return this.request<T>(url.toString(), {
            method: "GET",
            headers: this.defaultHeaders,
        });
    }

    async post<T>(endpoint: string, data?: any): Promise<T> {
        const url = new URL(endpoint, this.baseUrl);

        return this.request<T>(url.toString(), {
            method: "POST",
            headers: this.defaultHeaders,
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: any): Promise<T> {
        const url = new URL(endpoint, this.baseUrl);

        return this.request<T>(url.toString(), {
            method: "PUT",
            headers: this.defaultHeaders,
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string): Promise<T> {
        const url = new URL(endpoint, this.baseUrl);

        return this.request<T>(url.toString(), {
            method: "DELETE",
            headers: this.defaultHeaders,
        });
    }

    private async request<T>(url: string, options: RequestInit): Promise<T> {
        try {
            const response = await fetch(url, {
                ...options,
                signal: AbortSignal.timeout(30000), // 30 second timeout
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                let errorDetails: any = null;

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                    errorDetails = errorData;
                } catch {
                    // If we can't parse the error as JSON, use the status text
                }

                const error: AppError = {
                    message: errorMessage,
                    code: response.status.toString(),
                    details: errorDetails,
                };

                throw error;
            }

            // Handle empty responses
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                return {} as T;
            }

            const data = await response.json();
            return data;
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === "AbortError") {
                    throw {
                        message: "Request timeout - please check your connection",
                        code: "TIMEOUT",
                    } as AppError;
                }

                if (error.name === "TypeError" && error.message.includes("fetch")) {
                    throw {
                        message: "Network error - unable to connect to server",
                        code: "NETWORK_ERROR",
                    } as AppError;
                }
            }

            // Re-throw AppError objects
            if (typeof error === "object" && error !== null && "message" in error) {
                throw error;
            }

            // Wrap unknown errors
            throw {
                message: "An unexpected error occurred",
                details: error,
            } as AppError;
        }
    }

    // Convenience methods for common API endpoints
    async searchGlobal(query: string, type?: string) {
        return this.get("/api/search", { q: query, type });
    }

    async getMovieDetails(id: string) {
        return this.get(`/api/movies/${id}`);
    }

    async getActorDetails(id: string) {
        return this.get(`/api/actors/${id}`);
    }

    async getDirectorDetails(id: string) {
        return this.get(`/api/directors/${id}`);
    }

    async getUserRatings() {
        return this.get("/api/user/ratings");
    }

    async rateMovie(imdbId: string, rating: number, review?: string) {
        return this.post("/api/user/ratings", {
            imdbId,
            rating,
            review,
        });
    }

    async getRecommendations() {
        return this.get("/api/user/recommendations");
    }

    async getUserLists() {
        return this.get("/api/lists");
    }

    async createList(name: string, description?: string) {
        return this.post("/api/lists", { name, description });
    }

    async updateList(id: number, name: string, description?: string) {
        return this.put(`/api/lists/${id}`, { name, description });
    }

    async deleteList(id: number) {
        return this.delete(`/api/lists/${id}`);
    }

    async getListItems(listId: number) {
        return this.get(`/api/lists/${listId}/items`);
    }

    async addToList(
        listId: number,
        itemType: string,
        itemId: string,
        title: string,
        subtitle?: string,
        imageUrl?: string
    ) {
        return this.post(`/api/lists/${listId}/items`, {
            itemType,
            itemId,
            title,
            subtitle,
            imageUrl,
        });
    }

    async removeFromList(listId: number, itemType: string, itemId: string) {
        return this.delete(`/api/lists/${listId}/items/${itemType}/${itemId}`);
    }

    // Health check
    async healthCheck() {
        return this.get("/health");
    }
}
