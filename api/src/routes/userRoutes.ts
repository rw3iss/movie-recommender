// src/routes/userRoutes.ts
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { UserService } from "../services/UserService";
import { DatabaseService } from "../services/DatabaseService";
import { UserController } from "../controllers/UserController";
import {
    UserProfileBody,
    FavoriteBody,
    RatingBody,
    ImportBody,
    PaginationQuery,
    UserStatsQuery,
} from "../types/user.types";

export async function userRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    // Initialize services
    const databaseService = new DatabaseService(fastify.pg);
    const userService = new UserService(databaseService);
    const userController = new UserController(userService);

    // Get user profile
    fastify.get("/profile", {
        schema: {
            response: {
                200: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        username: { type: "string" },
                        email: { type: "string" },
                        createdAt: { type: "string" },
                        preferences: {
                            type: "object",
                            properties: {
                                theme: { type: "string", enum: ["light", "dark"] },
                                language: { type: "string" },
                                emailNotifications: { type: "boolean" },
                                publicProfile: { type: "boolean" },
                            },
                        },
                        stats: {
                            type: "object",
                            properties: {
                                moviesWatched: { type: "number" },
                                moviesRated: { type: "number" },
                                listsCreated: { type: "number" },
                                favoriteActors: { type: "number" },
                                favoriteDirectors: { type: "number" },
                                totalWatchTime: { type: "number" },
                            },
                        },
                        externalAccounts: {
                            type: "object",
                            properties: {
                                imdb: { type: ["string", "null"] },
                                tmdb: { type: ["string", "null"] },
                                letterboxd: { type: ["string", "null"] },
                            },
                        },
                    },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.getUserProfile(request, reply);
        },
    });

    // Update user profile
    fastify.put<{
        Body: UserProfileBody;
    }>("/profile", {
        schema: {
            body: {
                type: "object",
                properties: {
                    username: { type: "string", minLength: 3, maxLength: 30 },
                    preferences: {
                        type: "object",
                        properties: {
                            theme: { type: "string", enum: ["light", "dark"] },
                            language: { type: "string" },
                            emailNotifications: { type: "boolean" },
                            publicProfile: { type: "boolean" },
                        },
                    },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.updateUserProfile(request, reply);
        },
    });

    // Get user's favorite movies
    fastify.get<{
        Querystring: PaginationQuery & { sortBy?: "added" | "title" | "rating" };
    }>("/favorites/movies", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                    sortBy: {
                        type: "string",
                        enum: ["added", "title", "rating"],
                        default: "added",
                    },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.getFavoriteMovies(request, reply);
        },
    });

    // Get user's favorite actors
    fastify.get<{
        Querystring: PaginationQuery;
    }>("/favorites/actors", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.getFavoriteActors(request, reply);
        },
    });

    // Get user's favorite directors
    fastify.get<{
        Querystring: PaginationQuery;
    }>("/favorites/directors", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.getFavoriteDirectors(request, reply);
        },
    });

    // Add to favorites
    fastify.post<{
        Body: FavoriteBody;
    }>("/favorites", {
        schema: {
            body: {
                type: "object",
                properties: {
                    itemId: { type: "string" },
                    type: { type: "string", enum: ["movie", "actor", "director"] },
                },
                required: ["itemId", "type"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.addToFavorites(request, reply);
        },
    });

    // Remove from favorites
    fastify.delete<{
        Params: { type: string; itemId: string };
    }>("/favorites/:type/:itemId", {
        schema: {
            params: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["movie", "actor", "director"] },
                    itemId: { type: "string" },
                },
                required: ["type", "itemId"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.removeFromFavorites(request, reply);
        },
    });

    // Get user's movie ratings
    fastify.get<{
        Querystring: PaginationQuery & {
            minRating?: number;
            maxRating?: number;
            sortBy?: "rating" | "date" | "title";
        };
    }>("/ratings", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                    minRating: { type: "number", minimum: 0, maximum: 10 },
                    maxRating: { type: "number", minimum: 0, maximum: 10 },
                    sortBy: {
                        type: "string",
                        enum: ["rating", "date", "title"],
                        default: "date",
                    },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.getUserRatings(request, reply);
        },
    });

    // Rate an item (movie)
    fastify.post<{
        Body: RatingBody;
    }>("/ratings", {
        schema: {
            body: {
                type: "object",
                properties: {
                    itemId: { type: "string" },
                    rating: { type: "number", minimum: 0, maximum: 10 },
                    notes: { type: "string", maxLength: 1000 },
                },
                required: ["itemId", "rating"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.rateItem(request, reply);
        },
    });

    // Update rating
    fastify.put<{
        Params: { itemId: string };
        Body: { rating: number; notes?: string };
    }>("/ratings/:itemId", {
        schema: {
            params: {
                type: "object",
                properties: {
                    itemId: { type: "string" },
                },
                required: ["itemId"],
            },
            body: {
                type: "object",
                properties: {
                    rating: { type: "number", minimum: 0, maximum: 10 },
                    notes: { type: "string", maxLength: 1000 },
                },
                required: ["rating"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.updateRating(request, reply);
        },
    });

    // Delete rating
    fastify.delete<{
        Params: { itemId: string };
    }>("/ratings/:itemId", {
        schema: {
            params: {
                type: "object",
                properties: {
                    itemId: { type: "string" },
                },
                required: ["itemId"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.deleteRating(request, reply);
        },
    });

    // Get user statistics
    fastify.get<{
        Querystring: UserStatsQuery;
    }>("/stats", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    period: {
                        type: "string",
                        enum: ["week", "month", "year", "all"],
                        default: "all",
                    },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        watchStats: {
                            type: "object",
                            properties: {
                                totalMovies: { type: "number" },
                                totalRuntime: { type: "number" },
                                averageRating: { type: "number" },
                                genreDistribution: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            genre: { type: "string" },
                                            count: { type: "number" },
                                            percentage: { type: "number" },
                                        },
                                    },
                                },
                                yearDistribution: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            year: { type: "number" },
                                            count: { type: "number" },
                                        },
                                    },
                                },
                                ratingDistribution: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            rating: { type: "number" },
                                            count: { type: "number" },
                                        },
                                    },
                                },
                            },
                        },
                        favoriteStats: {
                            type: "object",
                            properties: {
                                topActors: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            movieCount: { type: "number" },
                                        },
                                    },
                                },
                                topDirectors: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            movieCount: { type: "number" },
                                        },
                                    },
                                },
                                topGenres: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            genre: { type: "string" },
                                            count: { type: "number" },
                                        },
                                    },
                                },
                            },
                        },
                        activityStats: {
                            type: "object",
                            properties: {
                                recentActivity: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            date: { type: "string" },
                                            count: { type: "number" },
                                        },
                                    },
                                },
                                streaks: {
                                    type: "object",
                                    properties: {
                                        current: { type: "number" },
                                        longest: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.getUserStats(request, reply);
        },
    });

    // Import data from external service
    fastify.post<{
        Body: ImportBody;
    }>("/import", {
        schema: {
            body: {
                type: "object",
                properties: {
                    source: { type: "string", enum: ["imdb", "tmdb", "letterboxd"] },
                    userId: { type: "string" },
                    importType: {
                        type: "string",
                        enum: ["ratings", "watchlist", "favorites", "all"],
                        default: "all",
                    },
                },
                required: ["source", "userId"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.importExternalData(request, reply);
        },
    });

    // Get import status
    fastify.get<{
        Params: { importId: string };
    }>("/import/:importId", {
        schema: {
            params: {
                type: "object",
                properties: {
                    importId: { type: "string" },
                },
                required: ["importId"],
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        status: {
                            type: "string",
                            enum: ["pending", "processing", "completed", "failed"],
                        },
                        progress: { type: "number" },
                        totalItems: { type: "number" },
                        processedItems: { type: "number" },
                        errors: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    item: { type: "string" },
                                    error: { type: "string" },
                                },
                            },
                        },
                        startedAt: { type: "string" },
                        completedAt: { type: ["string", "null"] },
                    },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.getImportStatus(request, reply);
        },
    });

    // Get user's watchlist
    fastify.get<{
        Querystring: PaginationQuery & {
            priority?: "high" | "medium" | "low";
            sortBy?: "added" | "priority" | "releaseDate";
        };
    }>("/watchlist", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    sortBy: {
                        type: "string",
                        enum: ["added", "priority", "releaseDate"],
                        default: "priority",
                    },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.getWatchlist(request, reply);
        },
    });

    // Add to watchlist
    fastify.post<{
        Body: {
            movieId: string;
            priority?: "high" | "medium" | "low";
            notes?: string;
        };
    }>("/watchlist", {
        schema: {
            body: {
                type: "object",
                properties: {
                    movieId: { type: "string" },
                    priority: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                        default: "medium",
                    },
                    notes: { type: "string", maxLength: 500 },
                },
                required: ["movieId"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.addToWatchlist(request, reply);
        },
    });

    // Remove from watchlist
    fastify.delete<{
        Params: { movieId: string };
    }>("/watchlist/:movieId", {
        schema: {
            params: {
                type: "object",
                properties: {
                    movieId: { type: "string" },
                },
                required: ["movieId"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return userController.removeFromWatchlist(request, reply);
        },
    });
}
