/**
 * List-specific type definitions
 */

export interface ListCreateBody {
    name: string;
    description?: string;
    isPublic?: boolean;
}

export interface ListUpdateBody {
    name?: string;
    description?: string;
    isPublic?: boolean;
}

export interface ListDetailsParams {
    id: string;
}

export interface ListItemBody {
    itemId: string;
    type: "movie" | "actor" | "director";
    notes?: string;
}

export interface ListItemParams {
    itemId: string;
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface ListResponse {
    id: string;
    name: string;
    description?: string;
    isPublic: boolean;
    owner: {
        id: string;
        username: string;
    };
    itemCount: number;
    createdAt: string;
    updatedAt: string;
    items?: Array<{
        id: string;
        itemId: string;
        type: "movie" | "actor" | "director";
        position: number;
        addedAt: string;
        notes?: string;
        details: any; // Movie, Actor, or Director details
    }>;
}

export interface ListItemResponse {
    id: string;
    listId: string;
    itemId: string;
    type: "movie" | "actor" | "director";
    position: number;
    addedAt: string;
    notes?: string;
}

export interface ListReorderBody {
    itemOrder: string[];
}

export interface ListCloneBody {
    name?: string;
}
