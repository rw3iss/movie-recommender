// src/routes/directorRoutes.ts
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { DirectorService } from "../services/DirectorService";
import { CacheService } from "../services/CacheService";
import { TMDBService } from "../services/TMDBService";
import { DatabaseService } from "../services/DatabaseService";
import { DirectorController } from "../controllers/DirectorController";
import { DirectorSearchParams, DirectorDetailsParams, DirectorFilters, PaginationQuery } from "../types/director.types";

export async function directorRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    // Initialize services
    const databaseService = new DatabaseService(fastify.pg);
    const tmdbService = new TMDBService();
    const cacheService = new CacheService();
    const directorService = new DirectorService(databaseService, tmdbService, cacheService);
    const directorController = new DirectorController(directorService);

    // Search directors with filters
    fastify.get<{
        Querystring: DirectorSearchParams & DirectorFilters & PaginationQuery;
    }>("/search", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    query: { type: "string" },
                    birthYearFrom: { type: "number" },
                    birthYearTo: { type: "number" },
                    nationality: { type: "string" },
                    minMovieCount: { type: "number" },
                    minAverageRating: { type: "number", minimum: 0, maximum: 10 },
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
                                    name: { type: "string" },
                                    birthYear: { type: "number" },
                                    deathYear: { type: ["number", "null"] },
                                    nationality: { type: "string" },
                                    profileImage: { type: "string" },
                                    movieCount: { type: "number" },
                                    averageRating: { type: "number" },
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
                    },
                },
            },
        },
        preHandler: fastify.rateLimit({
            max: 100,
            timeWindow: "1 minute",
        }),
        handler: async (request, reply) => {
            return directorController.searchDirectors(request, reply);
        },
    });

    // Get director details by ID
    fastify.get<{
        Params: DirectorDetailsParams;
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
                        name: { type: "string" },
                        biography: { type: "string" },
                        birthDate: { type: "string" },
                        deathDate: { type: ["string", "null"] },
                        birthPlace: { type: "string" },
                        nationality: { type: "string" },
                        profileImage: { type: "string" },
                        images: {
                            type: "array",
                            items: { type: "string" },
                        },
                        movies: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    title: { type: "string" },
                                    year: { type: "number" },
                                    rating: { type: "number" },
                                    voteCount: { type: "number" },
                                    posterPath: { type: "string" },
                                    budget: { type: "number" },
                                    revenue: { type: "number" },
                                },
                            },
                        },
                        statistics: {
                            type: "object",
                            properties: {
                                totalMovies: { type: "number" },
                                averageRating: { type: "number" },
                                totalRevenue: { type: "number" },
                                totalBudget: { type: "number" },
                                highestRatedMovie: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        title: { type: "string" },
                                        rating: { type: "number" },
                                    },
                                },
                                mostSuccessfulMovie: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        title: { type: "string" },
                                        revenue: { type: "number" },
                                    },
                                },
                            },
                        },
                        awards: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    year: { type: "number" },
                                    category: { type: "string" },
                                    movie: { type: "string" },
                                },
                            },
                        },
                        frequentCollaborators: {
                            type: "object",
                            properties: {
                                actors: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            collaborationCount: { type: "number" },
                                            movies: {
                                                type: "array",
                                                items: { type: "string" },
                                            },
                                        },
                                    },
                                },
                                producers: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            collaborationCount: { type: "number" },
                                        },
                                    },
                                },
                                writers: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            collaborationCount: { type: "number" },
                                        },
                                    },
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
            return directorController.getDirectorDetails(request, reply);
        },
    });

    // Get director's filmography
    fastify.get<{
        Params: DirectorDetailsParams;
        Querystring: PaginationQuery & {
            sortBy?: "year" | "rating" | "title" | "revenue";
            order?: "asc" | "desc";
        };
    }>("/:id/movies", {
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
                    sortBy: {
                        type: "string",
                        enum: ["year", "rating", "title", "revenue"],
                        default: "rating",
                    },
                    order: { type: "string", enum: ["asc", "desc"], default: "desc" },
                },
            },
        },
        handler: async (request, reply) => {
            return directorController.getDirectorMovies(request, reply);
        },
    });

    // Get similar directors
    fastify.get<{
        Params: DirectorDetailsParams;
    }>("/:id/similar", {
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: "string" },
                },
                required: ["id"],
            },
        },
        handler: async (request, reply) => {
            return directorController.getSimilarDirectors(request, reply);
        },
    });

    // Get director timeline
    fastify.get<{
        Params: DirectorDetailsParams;
    }>("/:id/timeline", {
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
                        timeline: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    year: { type: "number" },
                                    events: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                type: { type: "string", enum: ["movie", "award", "personal"] },
                                                title: { type: "string" },
                                                description: { type: "string" },
                                                date: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        handler: async (request, reply) => {
            return directorController.getDirectorTimeline(request, reply);
        },
    });

    // Get popular directors
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
            return directorController.getPopularDirectors(request, reply);
        },
    });

    // Get acclaimed directors (highest average ratings)
    fastify.get("/acclaimed", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                    minMovieCount: { type: "number", default: 5 },
                },
            },
        },
        handler: async (request, reply) => {
            return directorController.getAcclaimedDirectors(request, reply);
        },
    });

    // Sync director from TMDB to local database
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
            return directorController.syncDirectorFromTMDB(request, reply);
        },
    });
}
