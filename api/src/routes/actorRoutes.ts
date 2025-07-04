// src/routes/actorRoutes.ts
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { ActorService } from "../services/ActorService";
import { CacheService } from "../services/CacheService";
import { TMDBService } from "../services/TMDBService";
import { DatabaseService } from "../services/DatabaseService";
import { ActorController } from "../controllers/ActorController";
import { ActorSearchParams, ActorDetailsParams, ActorFilters, PaginationQuery } from "../types/actor.types";

export async function actorRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    // Initialize services
    const databaseService = new DatabaseService(fastify.pg);
    const tmdbService = new TMDBService();
    const cacheService = new CacheService();
    const actorService = new ActorService(databaseService, tmdbService, cacheService);
    const actorController = new ActorController(actorService);

    // Search actors with filters
    fastify.get<{
        Querystring: ActorSearchParams & ActorFilters & PaginationQuery;
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
            return actorController.searchActors(request, reply);
        },
    });

    // Get actor details by ID
    fastify.get<{
        Params: ActorDetailsParams;
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
                                    character: { type: "string" },
                                    rating: { type: "number" },
                                    posterPath: { type: "string" },
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
                                },
                            },
                        },
                        socialMedia: {
                            type: "object",
                            properties: {
                                twitter: { type: "string" },
                                instagram: { type: "string" },
                                facebook: { type: "string" },
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
            return actorController.getActorDetails(request, reply);
        },
    });

    // Get actor's filmography
    fastify.get<{
        Params: ActorDetailsParams;
        Querystring: PaginationQuery & { sortBy?: "year" | "rating" | "title" };
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
                    sortBy: { type: "string", enum: ["year", "rating", "title"], default: "rating" },
                },
            },
        },
        handler: async (request, reply) => {
            return actorController.getActorMovies(request, reply);
        },
    });

    // Get similar actors
    fastify.get<{
        Params: ActorDetailsParams;
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
            return actorController.getSimilarActors(request, reply);
        },
    });

    // Get popular actors
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
            return actorController.getPopularActors(request, reply);
        },
    });

    // Sync actor from TMDB to local database
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
        preHandler: fastify.authenticate, // Assuming authentication middleware
        handler: async (request, reply) => {
            return actorController.syncActorFromTMDB(request, reply);
        },
    });
}
