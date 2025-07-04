// src/routes/searchRoutes.ts
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { SearchService } from "../services/SearchService";
import { CacheService } from "../services/CacheService";
import { TMDBService } from "../services/TMDBService";
import { DatabaseService } from "../services/DatabaseService";
import { SearchController } from "../controllers/SearchController";
import { UniversalSearchParams, SearchFilters, SearchType, PaginationQuery } from "../types/search.types";

export async function searchRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    // Initialize services
    const databaseService = new DatabaseService(fastify.pg);
    const tmdbService = new TMDBService();
    const cacheService = new CacheService();
    const searchService = new SearchService(databaseService, tmdbService, cacheService);
    const searchController = new SearchController(searchService);

    // Universal search across all entities
    fastify.get<{
        Querystring: UniversalSearchParams & SearchFilters & PaginationQuery;
    }>("/", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    query: { type: "string", minLength: 1 },
                    type: {
                        type: "string",
                        enum: ["all", "movie", "actor", "director"],
                        default: "all",
                    },
                    // Movie filters
                    yearFrom: { type: "number" },
                    yearTo: { type: "number" },
                    genre: { type: "string" },
                    minRating: { type: "number", minimum: 0, maximum: 10 },
                    maxRating: { type: "number", minimum: 0, maximum: 10 },
                    minVotes: { type: "number" },
                    language: { type: "string" },
                    country: { type: "string" },
                    // Person filters (actors & directors)
                    birthYearFrom: { type: "number" },
                    birthYearTo: { type: "number" },
                    nationality: { type: "string" },
                    minMovieCount: { type: "number" },
                    // Pagination
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20, maximum: 100 },
                    // Options
                    includeAdult: { type: "boolean", default: false },
                },
                required: ["query"],
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        results: {
                            type: "object",
                            properties: {
                                movies: {
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
                                            matchedField: { type: "string" },
                                            relevanceScore: { type: "number" },
                                        },
                                    },
                                },
                                actors: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            birthYear: { type: "number" },
                                            nationality: { type: "string" },
                                            profileImage: { type: "string" },
                                            knownFor: {
                                                type: "array",
                                                items: { type: "string" },
                                            },
                                            source: { type: "string", enum: ["local", "tmdb"] },
                                            relevanceScore: { type: "number" },
                                        },
                                    },
                                },
                                directors: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            birthYear: { type: "number" },
                                            nationality: { type: "string" },
                                            profileImage: { type: "string" },
                                            knownFor: {
                                                type: "array",
                                                items: { type: "string" },
                                            },
                                            averageRating: { type: "number" },
                                            source: { type: "string", enum: ["local", "tmdb"] },
                                            relevanceScore: { type: "number" },
                                        },
                                    },
                                },
                            },
                        },
                        totalResults: {
                            type: "object",
                            properties: {
                                movies: { type: "number" },
                                actors: { type: "number" },
                                directors: { type: "number" },
                                total: { type: "number" },
                            },
                        },
                        pagination: {
                            type: "object",
                            properties: {
                                page: { type: "number" },
                                limit: { type: "number" },
                                totalPages: { type: "number" },
                            },
                        },
                        appliedFilters: {
                            type: "object",
                            additionalProperties: true,
                        },
                    },
                },
            },
        },
        preHandler: fastify.rateLimit({
            max: 200,
            timeWindow: "1 minute",
        }),
        handler: async (request, reply) => {
            return searchController.universalSearch(request, reply);
        },
    });

    // Quick search for autocomplete
    fastify.get<{
        Querystring: {
            query: string;
            type?: SearchType;
            limit?: number;
        };
    }>("/quick", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    query: { type: "string", minLength: 2 },
                    type: {
                        type: "string",
                        enum: ["all", "movie", "actor", "director"],
                        default: "all",
                    },
                    limit: { type: "number", default: 10, maximum: 20 },
                },
                required: ["query"],
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        suggestions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    type: { type: "string", enum: ["movie", "actor", "director"] },
                                    title: { type: "string" },
                                    subtitle: { type: "string" },
                                    year: { type: "number" },
                                    imageUrl: { type: "string" },
                                    rating: { type: "number" },
                                },
                            },
                        },
                    },
                },
            },
        },
        preHandler: fastify.rateLimit({
            max: 500,
            timeWindow: "1 minute",
        }),
        handler: async (request, reply) => {
            return searchController.quickSearch(request, reply);
        },
    });

    // Get trending searches
    fastify.get("/trending", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        enum: ["all", "movie", "actor", "director"],
                        default: "all",
                    },
                    limit: { type: "number", default: 10, maximum: 20 },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        trending: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    query: { type: "string" },
                                    type: { type: "string" },
                                    count: { type: "number" },
                                    lastSearched: { type: "string" },
                                },
                            },
                        },
                    },
                },
            },
        },
        handler: async (request, reply) => {
            return searchController.getTrendingSearches(request, reply);
        },
    });

    // Get search suggestions based on partial input
    fastify.get("/suggestions", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    query: { type: "string", minLength: 1 },
                    type: {
                        type: "string",
                        enum: ["all", "movie", "actor", "director"],
                        default: "all",
                    },
                },
                required: ["query"],
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        suggestions: {
                            type: "array",
                            items: { type: "string" },
                        },
                    },
                },
            },
        },
        handler: async (request, reply) => {
            return searchController.getSearchSuggestions(request, reply);
        },
    });

    // Get available filter options based on current search
    fastify.get("/filters", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    query: { type: "string" },
                    type: {
                        type: "string",
                        enum: ["all", "movie", "actor", "director"],
                        default: "all",
                    },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        filters: {
                            type: "object",
                            properties: {
                                genres: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            count: { type: "number" },
                                        },
                                    },
                                },
                                years: {
                                    type: "object",
                                    properties: {
                                        min: { type: "number" },
                                        max: { type: "number" },
                                    },
                                },
                                countries: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            code: { type: "string" },
                                            name: { type: "string" },
                                            count: { type: "number" },
                                        },
                                    },
                                },
                                languages: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            code: { type: "string" },
                                            name: { type: "string" },
                                            count: { type: "number" },
                                        },
                                    },
                                },
                                ratings: {
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
        handler: async (request, reply) => {
            return searchController.getAvailableFilters(request, reply);
        },
    });

    // Save search query for analytics and trending
    fastify.post<{
        Body: {
            query: string;
            type: SearchType;
            filters?: Record<string, any>;
            resultCount: number;
        };
    }>("/log", {
        schema: {
            body: {
                type: "object",
                properties: {
                    query: { type: "string" },
                    type: { type: "string", enum: ["all", "movie", "actor", "director"] },
                    filters: { type: "object" },
                    resultCount: { type: "number" },
                },
                required: ["query", "type", "resultCount"],
            },
        },
        handler: async (request, reply) => {
            return searchController.logSearch(request, reply);
        },
    });
}
