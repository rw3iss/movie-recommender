/**
 * Search-specific type definitions
 */

export type SearchType = "all" | "movie" | "actor" | "director";

export interface UniversalSearchParams {
    query: string;
    type?: SearchType;
}

export interface SearchFilters {
    // Movie filters
    yearFrom?: number;
    yearTo?: number;
    genre?: string;
    minRating?: number;
    maxRating?: number;
    minVotes?: number;
    language?: string;
    country?: string;
    // Person filters
    birthYearFrom?: number;
    birthYearTo?: number;
    nationality?: string;
    minMovieCount?: number;
    // General
    includeAdult?: boolean;
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface SearchResponse {
    results: {
        movies: Array<{
            id: string;
            title: string;
            year?: number;
            director?: string;
            rating?: number;
            voteCount?: number;
            posterPath?: string;
            genres: string[];
            source: "local" | "tmdb";
            matchedField?: string;
            relevanceScore?: number;
        }>;
        actors: Array<{
            id: string;
            name: string;
            birthYear?: number;
            nationality?: string;
            profileImage?: string;
            knownFor?: string[];
            source: "local" | "tmdb";
            relevanceScore?: number;
        }>;
        directors: Array<{
            id: string;
            name: string;
            birthYear?: number;
            nationality?: string;
            profileImage?: string;
            knownFor?: string[];
            averageRating?: number;
            source: "local" | "tmdb";
            relevanceScore?: number;
        }>;
    };
    totalResults: {
        movies: number;
        actors: number;
        directors: number;
        total: number;
    };
    pagination: {
        page: number;
        limit: number;
        totalPages: number;
    };
    appliedFilters: Record<string, any>;
}

export interface QuickSearchResult {
    id: string;
    type: "movie" | "actor" | "director";
    title: string;
    subtitle?: string;
    year?: number;
    imageUrl?: string;
    rating?: number;
}

export interface SearchSuggestion {
    query: string;
    type: SearchType;
    count: number;
    lastSearched: string;
}

export interface SearchFiltersResponse {
    filters: {
        genres: Array<{
            id: string;
            name: string;
            count: number;
        }>;
        years: {
            min: number;
            max: number;
        };
        countries: Array<{
            code: string;
            name: string;
            count: number;
        }>;
        languages: Array<{
            code: string;
            name: string;
            count: number;
        }>;
        ratings: {
            min: number;
            max: number;
        };
    };
}

export interface SearchLogBody {
    query: string;
    type: SearchType;
    filters?: Record<string, any>;
    resultCount: number;
}
