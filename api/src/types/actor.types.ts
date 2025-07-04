/**
 * Actor-specific type definitions
 */

export interface ActorSearchParams {
    query: string;
}

export interface ActorDetailsParams {
    id: string;
}

export interface ActorFilters {
    birthYearFrom?: number;
    birthYearTo?: number;
    nationality?: string;
    minMovieCount?: number;
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface ActorResponse {
    id: string;
    name: string;
    biography?: string;
    birthDate?: string;
    deathDate?: string;
    birthPlace?: string;
    nationality?: string;
    profileImage?: string;
    images: string[];
    movies: Array<{
        id: string;
        title: string;
        year?: number;
        character: string;
        rating?: number;
        posterPath?: string;
    }>;
    awards: Array<{
        name: string;
        year: number;
        category: string;
    }>;
    socialMedia?: {
        twitter?: string;
        instagram?: string;
        facebook?: string;
    };
}

export interface ActorSearchResult {
    id: string;
    name: string;
    birthYear?: number;
    deathYear?: number;
    nationality?: string;
    profileImage?: string;
    movieCount: number;
    source: "local" | "tmdb";
}
