/**
 * Director-specific type definitions
 */

export interface DirectorSearchParams {
    query: string;
}

export interface DirectorDetailsParams {
    id: string;
}

export interface DirectorFilters {
    birthYearFrom?: number;
    birthYearTo?: number;
    nationality?: string;
    minMovieCount?: number;
    minAverageRating?: number;
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface DirectorResponse {
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
        rating?: number;
        voteCount?: number;
        posterPath?: string;
        budget?: number;
        revenue?: number;
    }>;
    statistics: {
        totalMovies: number;
        averageRating: number;
        totalRevenue: number;
        totalBudget: number;
        highestRatedMovie?: {
            id: string;
            title: string;
            rating: number;
        };
        mostSuccessfulMovie?: {
            id: string;
            title: string;
            revenue: number;
        };
    };
    awards: Array<{
        name: string;
        year: number;
        category: string;
        movie?: string;
    }>;
    frequentCollaborators: {
        actors: Array<{
            id: string;
            name: string;
            collaborationCount: number;
            movies: string[];
        }>;
        producers: Array<{
            id: string;
            name: string;
            collaborationCount: number;
        }>;
        writers: Array<{
            id: string;
            name: string;
            collaborationCount: number;
        }>;
    };
}

export interface DirectorSearchResult {
    id: string;
    name: string;
    birthYear?: number;
    deathYear?: number;
    nationality?: string;
    profileImage?: string;
    movieCount: number;
    averageRating?: number;
    source: "local" | "tmdb";
}

export interface DirectorTimelineEvent {
    year: number;
    events: Array<{
        type: "movie" | "award" | "personal";
        title: string;
        description: string;
        date: string;
    }>;
}
