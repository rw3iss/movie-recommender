// Movie Types
export interface Movie {
    imdbId: string;
    tmdbId?: number;
    title: string;
    year?: number;
    genre?: string;
    director?: string;
    plot?: string;
    imdbRating?: number;
    runtime?: string;
    actors?: string;
    posterUrl?: string;
    backdropUrl?: string;
    releaseDate?: string;
    voteCount?: number;
    budget?: number;
    revenue?: number;
    homepage?: string;
    createdAt?: string;
    updatedAt?: string;
}

// Actor Types
export interface Actor {
    id: number;
    name: string;
    birthDate?: string;
    deathDate?: string;
    birthPlace?: string;
    biography?: string;
    profilePath?: string;
    knownFor?: string;
}

export interface ActorMovie {
    title: string;
    year?: number;
    role: string;
    imdbRating?: number | string;
    tmdbId?: number;
}

// Director Types
export interface Director {
    id: number;
    name: string;
    birthDate?: string;
    deathDate?: string;
    birthPlace?: string;
    biography?: string;
    profilePath?: string;
    knownFor?: string;
}

export interface DirectorMovie {
    title: string;
    year?: number;
    genre?: string;
    imdbRating?: number | string;
    tmdbId?: number;
}

// User Rating Types
export interface UserRating {
    id?: number;
    imdbId: string;
    title: string;
    rating: number;
    review?: string;
    dateRated: Date | string;
    source?: string;
    createdAt?: string;
}

// List Types
export interface UserList {
    id?: number;
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    itemCount?: number;
}

export interface ListItem {
    id?: number;
    listId: number;
    itemType: "movie" | "actor" | "director";
    itemId: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    addedAt?: string;
}

// Recommendation Types
export interface Recommendation {
    imdbId: string;
    tmdbId?: number;
    title: string;
    year?: number;
    genre?: string;
    director?: string;
    score: number;
    reason: string;
    rank?: number;
}

// Search Types
export interface SearchOptions {
    sort?: "title" | "date" | "rating";
    page?: number;
    limit?: number;
}

export interface SearchResult {
    movies: Movie[];
    actors: Actor[];
    directors: Director[];
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// User Preferences Types
export interface UserPreferences {
    totalRatings: number;
    averageRating: number;
    favoriteGenres: Array<{
        genre: string;
        averageRating: number;
        count: number;
    }>;
    favoriteDirectors: Array<{
        director: string;
        averageRating: number;
        count: number;
    }>;
    favoriteDecades: Array<{
        decade: string;
        averageRating: number;
        count: number;
    }>;
    ratingDistribution: Record<number, number>;
}

// Database Types
export interface DatabaseMovie {
    imdb_id: string;
    tmdb_id?: number;
    title: string;
    year?: number;
    genre?: string;
    director?: string;
    plot?: string;
    imdb_rating?: number;
    runtime?: string;
    actors?: string;
    poster_url?: string;
    backdrop_url?: string;
    release_date?: string;
    vote_count?: number;
    budget?: number;
    revenue?: number;
    homepage?: string;
    created_at?: string;
    updated_at?: string;
}

export interface DatabaseUserRating {
    id?: number;
    imdb_id: string;
    title: string;
    rating: number;
    review?: string;
    date_rated: string;
    source?: string;
    created_at?: string;
}

export interface DatabaseUserList {
    id?: number;
    name: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface DatabaseListItem {
    id?: number;
    list_id: number;
    item_type: "movie" | "actor" | "director";
    item_id: string;
    title: string;
    subtitle?: string;
    image_url?: string;
    added_at?: string;
}
