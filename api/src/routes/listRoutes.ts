// src/routes/listRoutes.ts
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from "fastify";
import { ListService } from "../services/ListService";
import { DatabaseService } from "../services/DatabaseService";
import { ListController } from "../controllers/ListController";
import {
    ListCreateBody,
    ListUpdateBody,
    ListDetailsParams,
    ListItemBody,
    ListItemParams,
    PaginationQuery,
} from "../types/list.types";

export async function listRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
    // Initialize services
    const databaseService = new DatabaseService(fastify.pg);
    const listService = new ListService(databaseService);
    const listController = new ListController(listService);

    // Get all lists for the authenticated user
    fastify.get<{
        Querystring: PaginationQuery & { sortBy?: "name" | "created" | "updated" | "itemCount" };
    }>("/", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20, maximum: 100 },
                    sortBy: {
                        type: "string",
                        enum: ["name", "created", "updated", "itemCount"],
                        default: "updated",
                    },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        lists: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    isPublic: { type: "boolean" },
                                    itemCount: { type: "number" },
                                    createdAt: { type: "string" },
                                    updatedAt: { type: "string" },
                                    items: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                id: { type: "string" },
                                                type: { type: "string", enum: ["movie", "actor", "director"] },
                                                title: { type: "string" },
                                                imageUrl: { type: "string" },
                                            },
                                        },
                                    },
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
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return listController.getUserLists(request, reply);
        },
    });

    // Create a new list
    fastify.post<{
        Body: ListCreateBody;
    }>("/", {
        schema: {
            body: {
                type: "object",
                properties: {
                    name: { type: "string", minLength: 1, maxLength: 100 },
                    description: { type: "string", maxLength: 500 },
                    isPublic: { type: "boolean", default: false },
                },
                required: ["name"],
            },
            response: {
                201: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string" },
                        isPublic: { type: "boolean" },
                        itemCount: { type: "number" },
                        createdAt: { type: "string" },
                    },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return listController.createList(request, reply);
        },
    });

    // Get list details
    fastify.get<{
        Params: ListDetailsParams;
        Querystring: PaginationQuery;
    }>("/:id", {
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
                    limit: { type: "number", default: 20, maximum: 100 },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string" },
                        isPublic: { type: "boolean" },
                        owner: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                username: { type: "string" },
                            },
                        },
                        itemCount: { type: "number" },
                        createdAt: { type: "string" },
                        updatedAt: { type: "string" },
                        items: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    itemId: { type: "string" },
                                    type: { type: "string", enum: ["movie", "actor", "director"] },
                                    position: { type: "number" },
                                    addedAt: { type: "string" },
                                    notes: { type: "string" },
                                    details: {
                                        type: "object",
                                        additionalProperties: true,
                                    },
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
                403: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
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
        preHandler: async (request, reply) => {
            // Check if list is public or user owns it
            await listController.checkListAccess(request, reply);
        },
        handler: async (request, reply) => {
            return listController.getListDetails(request, reply);
        },
    });

    // Update list details
    fastify.put<{
        Params: ListDetailsParams;
        Body: ListUpdateBody;
    }>("/:id", {
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
                    name: { type: "string", minLength: 1, maxLength: 100 },
                    description: { type: "string", maxLength: 500 },
                    isPublic: { type: "boolean" },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return listController.updateList(request, reply);
        },
    });

    // Delete a list
    fastify.delete<{
        Params: ListDetailsParams;
    }>("/:id", {
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: "string" },
                },
                required: ["id"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return listController.deleteList(request, reply);
        },
    });

    // Add item to list
    fastify.post<{
        Params: ListDetailsParams;
        Body: ListItemBody;
    }>("/:id/items", {
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
                    itemId: { type: "string" },
                    type: { type: "string", enum: ["movie", "actor", "director"] },
                    notes: { type: "string", maxLength: 500 },
                },
                required: ["itemId", "type"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return listController.addItemToList(request, reply);
        },
    });

    // Remove item from list
    fastify.delete<{
        Params: ListDetailsParams & ListItemParams;
    }>("/:id/items/:itemId", {
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    itemId: { type: "string" },
                },
                required: ["id", "itemId"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return listController.removeItemFromList(request, reply);
        },
    });

    // Update item position in list
    fastify.patch<{
        Params: ListDetailsParams & ListItemParams;
        Body: { position: number; notes?: string };
    }>("/:id/items/:itemId", {
        schema: {
            params: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    itemId: { type: "string" },
                },
                required: ["id", "itemId"],
            },
            body: {
                type: "object",
                properties: {
                    position: { type: "number", minimum: 0 },
                    notes: { type: "string", maxLength: 500 },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return listController.updateItemInList(request, reply);
        },
    });

    // Reorder items in list
    fastify.post<{
        Params: ListDetailsParams;
        Body: { itemOrder: string[] };
    }>("/:id/reorder", {
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
                    itemOrder: {
                        type: "array",
                        items: { type: "string" },
                    },
                },
                required: ["itemOrder"],
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return listController.reorderListItems(request, reply);
        },
    });

    // Clone a list
    fastify.post<{
        Params: ListDetailsParams;
        Body: { name?: string };
    }>("/:id/clone", {
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
                    name: { type: "string" },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return listController.cloneList(request, reply);
        },
    });

    // Get public lists
    fastify.get("/public", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    page: { type: "number", default: 1 },
                    limit: { type: "number", default: 20 },
                    search: { type: "string" },
                    sortBy: {
                        type: "string",
                        enum: ["popular", "recent", "name"],
                        default: "popular",
                    },
                },
            },
        },
        handler: async (request, reply) => {
            return listController.getPublicLists(request, reply);
        },
    });

    // Get recommended lists
    fastify.get("/recommended", {
        schema: {
            querystring: {
                type: "object",
                properties: {
                    limit: { type: "number", default: 10, maximum: 20 },
                },
            },
        },
        preHandler: fastify.authenticate,
        handler: async (request, reply) => {
            return listController.getRecommendedLists(request, reply);
        },
    });
}
