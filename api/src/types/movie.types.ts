/**
 * Movie-specific type definitions
 */

export interface MovieSearchParams {
    query: string;
}

export interface MovieDetailsParams {
    id: string;
}

export interface MovieFilters {
    yearFrom?: number;
    yearTo?: number;
    genre?: string;
    minRating?: number;
    maxRating?: number;
    minVotes?: number;
    director?: string;
    actor?: string;
    language?: string;
    country?: string;
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface MovieRatingBody {
    rating: number;
    notes?: string;
}

export interface MovieResponse {
    id: string;
    imdbId: string;
    tmdbId?: string;
    title: string;
    originalTitle?: string;
    year?: number;
    releaseDate?: string;
    runtime?: number;
    genres: string[];
    director: {
        id: string;
        name: string;
    };
    cast: Array<{
        id: string;
        name: string;
        character: string;
        order: number;
        profilePath?: string;
    }>;
    crew: Array<{
        id: string;
        name: string;
        department: string;
        job: string;
    }>;
    plot?: string;
    tagline?: string;
    posterPath?: string;
    backdropPath?: string;
    rating?: number;
    voteCount?: number;
    budget?: number;
    revenue?: number;
    productionCompanies: Array<{
        id: string;
        name: string;
        logoPath?: string;
    }>;
    languages: string[];
    countries: string[];
    keywords: string[];
    userRating?: number;
    userNotes?: string;
    watchedDate?: string;
    lists: Array<{
        id: string;
        name: string;
    }>;
}

export interface MovieSearchResult {
    id: string;
    title: string;
    year?: number;
    director?: string;
    rating?: number;
    voteCount?: number;
    posterPath?: string;
    genres: string[];
    source: "local" | "tmdb";
}
