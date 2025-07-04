/**
 * User-specific type definitions
 */

export interface UserProfileBody {
    username?: string;
    preferences?: {
        theme?: "light" | "dark";
        language?: string;
        emailNotifications?: boolean;
        publicProfile?: boolean;
    };
}

export interface FavoriteBody {
    itemId: string;
    type: "movie" | "actor" | "director";
}

export interface RatingBody {
    itemId: string;
    rating: number;
    notes?: string;
}

export interface ImportBody {
    source: "imdb" | "tmdb" | "letterboxd";
    userId: string;
    importType?: "ratings" | "watchlist" | "favorites" | "all";
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
}

export interface UserStatsQuery {
    period?: "week" | "month" | "year" | "all";
}

export interface UserProfileResponse {
    id: string;
    username: string;
    email: string;
    createdAt: string;
    preferences: {
        theme: "light" | "dark";
        language: string;
        emailNotifications: boolean;
        publicProfile: boolean;
    };
    stats: {
        moviesWatched: number;
        moviesRated: number;
        listsCreated: number;
        favoriteActors: number;
        favoriteDirectors: number;
        totalWatchTime: number;
    };
    externalAccounts?: {
        imdb?: string;
        tmdb?: string;
        letterboxd?: string;
    };
}

export interface WatchlistBody {
    movieId: string;
    priority?: "high" | "medium" | "low";
    notes?: string;
}

export interface UserStatsResponse {
    watchStats: {
        totalMovies: number;
        totalRuntime: number;
        averageRating: number;
        genreDistribution: Array<{
            genre: string;
            count: number;
            percentage: number;
        }>;
        yearDistribution: Array<{
            year: number;
            count: number;
        }>;
        ratingDistribution: Array<{
            rating: number;
            count: number;
        }>;
    };
    favoriteStats: {
        topActors: Array<{
            id: string;
            name: string;
            movieCount: number;
        }>;
        topDirectors: Array<{
            id: string;
            name: string;
            movieCount: number;
        }>;
        topGenres: Array<{
            genre: string;
            count: number;
        }>;
    };
    activityStats: {
        recentActivity: Array<{
            date: string;
            count: number;
        }>;
        streaks: {
            current: number;
            longest: number;
        };
    };
}

export interface ImportStatusResponse {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    totalItems: number;
    processedItems: number;
    errors: Array<{
        item: string;
        error: string;
    }>;
    startedAt: string;
    completedAt?: string;
}
