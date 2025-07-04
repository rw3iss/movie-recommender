// API Response Types
export interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
}

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
export interface SearchResult {
    movies: Movie[];
    actors: Actor[];
    directors: Director[];
}

export interface SearchOptions {
    sort?: "title" | "date" | "rating";
    page?: number;
    limit?: number;
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

// Theme Types
export type Theme = "light" | "dark";

// Cache Types
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    key: string;
}

// Component Props Types
export interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
}

export interface MovieCardProps extends BaseComponentProps {
    movie: Movie;
    onClick?: (movie: Movie) => void;
    showRating?: boolean;
}

export interface ActorCardProps extends BaseComponentProps {
    actor: Actor;
    onClick?: (actor: Actor) => void;
}

export interface DirectorCardProps extends BaseComponentProps {
    director: Director;
    onClick?: (director: Director) => void;
}

export interface SearchDropdownProps extends BaseComponentProps {
    results: SearchResult;
    isVisible: boolean;
    onItemClick: (type: "movie" | "actor" | "director", item: Movie | Actor | Director) => void;
}

export interface NavigationProps extends BaseComponentProps {
    lists: UserList[];
    currentPath: string;
}

// Service Types
export interface CacheServiceInterface {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, data: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}

export interface ApiServiceInterface {
    get<T>(endpoint: string, params?: Record<string, any>): Promise<T>;
    post<T>(endpoint: string, data?: any): Promise<T>;
    put<T>(endpoint: string, data?: any): Promise<T>;
    delete<T>(endpoint: string): Promise<T>;
}

// Error Types
export interface AppError {
    message: string;
    code?: string;
    details?: any;
}

// App State Types
export interface AppState {
    theme: Theme;
    user: {
        favoriteMovies: Movie[];
        favoriteActors: Actor[];
        favoriteDirectors: Director[];
        lists: UserList[];
        preferences: UserPreferences | null;
    };
    loading: {
        search: boolean;
        recommendations: boolean;
        details: boolean;
    };
    error: AppError | null;
}
