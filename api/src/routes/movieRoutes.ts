// src/routes/movieRoutes.ts
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { MovieService } from "../services/MovieService";
import { CacheService } from "../services/CacheService";
import { TMDBService } from "../services/TMDBService";
import { DatabaseService } from "../services/DatabaseService";
import { MovieController } from "../controllers/MovieController";
import { RecommendationEngine } from "../services/RecommendationEngine";
import {
    MovieSearchParams,
    MovieDetailsParams,
    MovieFilters,
    PaginationQuery,
    MovieRatingBody,
} from "../types/movie.types";

export async function movieRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    // Initialize services
    const databaseService = new DatabaseService(fastify.pg);
    const tmdbService = new TMDBService();
    const cacheService = new CacheService();
    const movieService = new MovieService(databaseService, tmdbService, cacheService);
    const recommendationEngine = new RecommendationEngine(databaseService);
    const movieController = new MovieController(movieService, recommendationEngine);

    // Search movies with filters
    fastify.get<{
        Querystring: MovieSearchParams & MovieFilters & PaginationQuery;
    }>("/search", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    query: { type: "string" },
                    yearFrom: { type: "number" },
                    yearTo: { type: "number" },
                    genre: { type: "string" },
                    minRating: { type: "number", minimum: 0, maximum: 10 },
                    maxRating: { type: "number", minimum: 0, maximum: 10 },
                    minVotes: { type: "number" },
                    director: { type: "string" },
                    actor: { type: "string" },
                    language: { type: "string" },
                    country: { type: "string" },
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20, maximum: 100 },
                },
                required: ["query"],
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        results: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    title: { type: "string" },
                                    year: { type: "number" },
                                    director: { type: "string" },
                                    rating: { type: "number" },
                                    voteCount: { type: "number" },
                                    posterPath: { type: "string" },
                                    genres: {
                                        type: "array",
                                        items: { type: "string" },
                                    },
                                    source: { type: "string", enum: ["local", "tmdb"] },
                                },
                            },
                        },
                        pagination: {
                            type: "object",
                            properties: {
                                page: { type: "number" },
                                limit: { type: "number" },
                                total: { type: "number" },
                                totalPages: { type: "number" },
                            },
                        },
                        filters: {
                            type: "object",
                            properties: {
                                availableGenres: {
                                    type: "array",
                                    items: { type: "string" },
                                },
                                yearRange: {
                                    type: "object",
                                    properties: {
                                        min: { type: "number" },
                                        max: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        preHandler: fastify.rateLimit({
            max: 100,
            timeWindow: "1 minute",
        }),
        handler: async (request, reply) => {
            return movieController.searchMovies(request, reply);
        },
    });

    // Get movie details by ID
    fastify.get<{
        Params: MovieDetailsParams;
    }>("/:id", {
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: "string" },
                },
                required: ["id"],
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        imdbId: { type: "string" },
                        tmdbId: { type: "string" },
                        title: { type: "string" },
                        originalTitle: { type: "string" },
                        year: { type: "number" },
                        releaseDate: { type: "string" },
                        runtime: { type: "number" },
                        genres: {
                            type: "array",
                            items: { type: "string" },
                        },
                        director: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                            },
                        },
                        cast: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    character: { type: "string" },
                                    order: { type: "number" },
                                    profilePath: { type: "string" },
                                },
                            },
                        },
                        crew: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    department: { type: "string" },
                                    job: { type: "string" },
                                },
                            },
                        },
                        plot: { type: "string" },
                        tagline: { type: "string" },
                        posterPath: { type: "string" },
                        backdropPath: { type: "string" },
                        rating: { type: "number" },
                        voteCount: { type: "number" },
                        budget: { type: "number" },
                        revenue: { type: "number" },
                        productionCompanies: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    logoPath: { type: "string" },
                                },
                            },
                        },
                        languages: {
                            type: "array",
                            items: { type: "string" },
                        },
                        countries: {
                            type: "array",
                            items: { type: "string" },
                        },
                        keywords: {
                            type: "array",
                            items: { type: "string" },
                        },
                        userRating: { type: ["number", "null"] },
                        userNotes: { type: ["string", "null"] },
                        watchedDate: { type: ["string", "null"] },
                        lists: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                },
                            },
                        },
                    },
                },
                404: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                    },
                },
            },
        },
        handler: async (request, reply) => {
            return movieController.getMovieDetails(request, reply);
        },
    });

    // Get similar/related movies
    fastify.get<{
        Params: MovieDetailsParams;
    }>("/:id/similar", {
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: "string" },
                },
                required: ["id"],
            },
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                },
            },
        },
        handler: async (request, reply) => {
            return movieController.getSimilarMovies(request, reply);
        },
    });

    // Get movie recommendations for user
    fastify.get("/recommendations", {
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
            return movieController.getRecommendations(request, reply);
        },
    });

    // Rate a movie
    fastify.post<{
        Params: MovieDetailsParams;
        Body: MovieRatingBody;
    }>("/:id/rate", {
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: "string" },
                },
                required: ["id"],
            },
            body: {
                type: "object",
                properties: {
                    rating: { type: "number", minimum: 0, maximum: 10 },
                    notes: { type: "string" },
                },
                required: ["rating"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return movieController.rateMovie(request, reply);
        },
    });

    // Get popular movies
    fastify.get("/popular", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                },
            },
        },
        handler: async (request, reply) => {
            return movieController.getPopularMovies(request, reply);
        },
    });

    // Get top rated movies
    fastify.get("/top-rated", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                },
            },
        },
        handler: async (request, reply) => {
            return movieController.getTopRatedMovies(request, reply);
        },
    });

    // Get upcoming movies
    fastify.get("/upcoming", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                },
            },
        },
        handler: async (request, reply) => {
            return movieController.getUpcomingMovies(request, reply);
        },
    });

    // Sync movie from TMDB to local database
    fastify.post<{
        Body: { tmdbId: string };
    }>("/sync", {
        schema: {
            body: {
                type: "object",
                properties: {
                    tmdbId: { type: "string" },
                },
                required: ["tmdbId"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return movieController.syncMovieFromTMDB(request, reply);
        },
    });
}
