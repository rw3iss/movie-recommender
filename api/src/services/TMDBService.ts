import axios, { AxiosInstance, AxiosResponse } from "axios";
import { config } from "../config";
import { Movie, Actor, Director, ActorMovie, DirectorMovie } from "../types";

interface TMDBMovieResponse {
    id: number;
    imdb_id?: string;
    title: string;
    release_date?: string;
    overview?: string;
    vote_average: number;
    vote_count: number;
    poster_path?: string;
    backdrop_path?: string;
    runtime?: number;
    budget?: number;
    revenue?: number;
    homepage?: string;
    genres: Array<{ id: number; name: string }>;
}

interface TMDBPersonResponse {
    id: number;
    name: string;
    birthday?: string;
    deathday?: string;
    place_of_birth?: string;
    biography?: string;
    profile_path?: string;
    known_for_department: string;
    known_for?: Array<{ title?: string; name?: string }>;
}

interface TMDBCreditsResponse {
    cast: Array<{
        id: number;
        name: string;
        character: string;
        order: number;
        profile_path?: string;
    }>;
    crew: Array<{
        id: number;
        name: string;
        job: string;
        department: string;
    }>;
}

interface TMDBSearchResponse<T> {
    page: number;
    results: T[];
    total_pages: number;
    total_results: number;
}

/**
 * TMDB service for fetching movie, actor, and director data
 * Uses The Movie Database (TMDB) API for comprehensive movie information
 */
export class TMDBService {
    private axiosInstance: AxiosInstance;
    private imageBaseUrl: string = "https://image.tmdb.org/t/p/w500";
    private backdropBaseUrl: string = "https://image.tmdb.org/t/p/w1280";
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private cacheTimeout: number = 1000 * 60 * 60; // 1 hour

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: "https://api.themoviedb.org/3",
            timeout: 10000,
            headers: {
                Authorization: `Bearer ${config.TMDB_READ_ACCESS_TOKEN}`,
                "Content-Type": "application/json;charset=utf-8",
            },
        });

        // Add response interceptor for error handling
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 404) {
                    return Promise.reject(new Error("Resource not found"));
                }
                if (error.response?.status === 401) {
                    return Promise.reject(new Error("Invalid TMDB API credentials"));
                }
                if (error.response?.status === 429) {
                    return Promise.reject(new Error("TMDB API rate limit exceeded"));
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * Search for movies by title
     */
    async searchMovies(query: string, page: number = 1): Promise<Movie[]> {
        const cacheKey = `search_movies_${query.toLowerCase()}_${page}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse<TMDBSearchResponse<TMDBMovieResponse>> = await this.axiosInstance.get(
                "/search/movie",
                {
                    params: {
                        query,
                        page,
                        include_adult: false,
                        language: "en-US",
                    },
                }
            );

            const movies = response.data.results.map((movie) => this.formatMovieSearchResult(movie));
            this.setCache(cacheKey, movies);
            return movies;
        } catch (error) {
            throw new Error(`Failed to search movies: ${(error as Error).message}`);
        }
    }

    /**
     * Search for movies by actor name
     */
    async searchMoviesByActor(actorName: string): Promise<Movie[]> {
        try {
            // First, search for the actor
            const actors = await this.searchActors(actorName);
            if (actors.length === 0) return [];

            // Get the first actor's movies
            const actor = actors[0];
            const movies = await this.getActorMovies(actor.id);

            return movies.map(
                (movie) =>
                    ({
                        imdbId: `tmdb_${movie.tmdbId}`,
                        tmdbId: movie.tmdbId,
                        title: movie.title,
                        year: movie.year,
                        director: undefined,
                        genre: undefined,
                        imdbRating: typeof movie.imdbRating === "number" ? movie.imdbRating : undefined,
                        posterUrl: undefined,
                    } as Movie)
            );
        } catch (error) {
            throw new Error(`Failed to search movies by actor: ${(error as Error).message}`);
        }
    }

    /**
     * Search for movies by director name
     */
    async searchMoviesByDirector(directorName: string): Promise<Movie[]> {
        try {
            // First, search for the director
            const directors = await this.searchDirectors(directorName);
            if (directors.length === 0) return [];

            // Get the first director's movies
            const director = directors[0];
            const movies = await this.getDirectorMovies(director.id);

            return movies.map(
                (movie) =>
                    ({
                        imdbId: `tmdb_${movie.tmdbId}`,
                        tmdbId: movie.tmdbId,
                        title: movie.title,
                        year: movie.year,
                        director: director.name,
                        genre: movie.genre,
                        imdbRating: typeof movie.imdbRating === "number" ? movie.imdbRating : undefined,
                        posterUrl: undefined,
                    } as Movie)
            );
        } catch (error) {
            throw new Error(`Failed to search movies by director: ${(error as Error).message}`);
        }
    }

    /**
     * Search for actors
     */
    async searchActors(query: string, page: number = 1): Promise<Actor[]> {
        const cacheKey = `search_actors_${query.toLowerCase()}_${page}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse<TMDBSearchResponse<TMDBPersonResponse>> = await this.axiosInstance.get(
                "/search/person",
                {
                    params: {
                        query,
                        page,
                        include_adult: false,
                        language: "en-US",
                    },
                }
            );

            const actors = response.data.results
                .filter((person) => person.known_for_department === "Acting")
                .map((actor) => this.formatActorSearchResult(actor));

            this.setCache(cacheKey, actors);
            return actors;
        } catch (error) {
            throw new Error(`Failed to search actors: ${(error as Error).message}`);
        }
    }

    /**
     * Search for directors
     */
    async searchDirectors(query: string, page: number = 1): Promise<Director[]> {
        const cacheKey = `search_directors_${query.toLowerCase()}_${page}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse<TMDBSearchResponse<TMDBPersonResponse>> = await this.axiosInstance.get(
                "/search/person",
                {
                    params: {
                        query,
                        page,
                        include_adult: false,
                        language: "en-US",
                    },
                }
            );

            const directors = response.data.results
                .filter((person) => person.known_for_department === "Directing")
                .map((director) => this.formatDirectorSearchResult(director));

            this.setCache(cacheKey, directors);
            return directors;
        } catch (error) {
            throw new Error(`Failed to search directors: ${(error as Error).message}`);
        }
    }

    /**
     * Get detailed movie information by TMDB ID
     */
    async getMovieDetails(tmdbId: number): Promise<Movie> {
        const cacheKey = `movie_details_${tmdbId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const [movieResponse, creditsResponse] = await Promise.all([
                this.axiosInstance.get<TMDBMovieResponse>(`/movie/${tmdbId}`, {
                    params: { language: "en-US" },
                }),
                this.axiosInstance.get<TMDBCreditsResponse>(`/movie/${tmdbId}/credits`, {
                    params: { language: "en-US" },
                }),
            ]);

            const movie = this.formatMovieDetails(movieResponse.data, creditsResponse.data);
            this.setCache(cacheKey, movie);
            return movie;
        } catch (error) {
            throw new Error(`Failed to get movie details: ${(error as Error).message}`);
        }
    }

    /**
     * Get actor details and filmography
     */
    async getActorDetails(actorId: number): Promise<{ actor: Actor; movies: ActorMovie[] }> {
        const cacheKey = `actor_details_${actorId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const [personResponse, creditsResponse] = await Promise.all([
                this.axiosInstance.get<TMDBPersonResponse>(`/person/${actorId}`, {
                    params: { language: "en-US" },
                }),
                this.axiosInstance.get(`/person/${actorId}/movie_credits`, {
                    params: { language: "en-US" },
                }),
            ]);

            const result = {
                actor: this.formatActorDetails(personResponse.data),
                movies: creditsResponse.data.cast
                    .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
                    .slice(0, 20)
                    .map((movie: any) => ({
                        title: movie.title,
                        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                        role: movie.character,
                        imdbRating: movie.vote_average || "N/A",
                        tmdbId: movie.id,
                    })),
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            throw new Error(`Failed to get actor details: ${(error as Error).message}`);
        }
    }

    /**
     * Get director details and filmography
     */
    async getDirectorDetails(directorId: number): Promise<{ director: Director; movies: DirectorMovie[] }> {
        const cacheKey = `director_details_${directorId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const [personResponse, creditsResponse] = await Promise.all([
                this.axiosInstance.get<TMDBPersonResponse>(`/person/${directorId}`, {
                    params: { language: "en-US" },
                }),
                this.axiosInstance.get(`/person/${directorId}/movie_credits`, {
                    params: { language: "en-US" },
                }),
            ]);

            const result = {
                director: this.formatDirectorDetails(personResponse.data),
                movies: creditsResponse.data.crew
                    .filter((movie: any) => movie.job === "Director")
                    .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
                    .slice(0, 20)
                    .map((movie: any) => ({
                        title: movie.title,
                        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                        genre: undefined, // Would need additional API call
                        imdbRating: movie.vote_average || "N/A",
                        tmdbId: movie.id,
                    })),
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            throw new Error(`Failed to get director details: ${(error as Error).message}`);
        }
    }

    /**
     * Get similar movies
     */
    async getSimilarMovies(tmdbId: number): Promise<Movie[]> {
        const cacheKey = `similar_movies_${tmdbId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse = await this.axiosInstance.get(`/movie/${tmdbId}/similar`, {
                params: { language: "en-US", page: 1 },
            });

            const movies = response.data.results.slice(0, 5).map((movie: any) => ({
                imdbId: movie.imdb_id || `tmdb_${movie.id}`,
                tmdbId: movie.id,
                title: movie.title,
                year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                imdbRating: movie.vote_average || undefined,
                posterUrl: movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : undefined,
            }));

            this.setCache(cacheKey, movies);
            return movies;
        } catch (error) {
            console.warn("Failed to get similar movies:", (error as Error).message);
            return [];
        }
    }

    /**
     * Get actor's movie credits
     */
    async getActorMovies(actorId: number): Promise<ActorMovie[]> {
        const cacheKey = `actor_movies_${actorId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse = await this.axiosInstance.get(`/person/${actorId}/movie_credits`, {
                params: { language: "en-US" },
            });

            const movies = response.data.cast
                .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
                .map((movie: any) => ({
                    title: movie.title,
                    year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                    role: movie.character,
                    imdbRating: movie.vote_average,
                    tmdbId: movie.id,
                }));

            this.setCache(cacheKey, movies);
            return movies;
        } catch (error) {
            throw new Error(`Failed to get actor movies: ${(error as Error).message}`);
        }
    }

    /**
     * Get director's movie credits
     */
    async getDirectorMovies(directorId: number): Promise<DirectorMovie[]> {
        const cacheKey = `director_movies_${directorId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse = await this.axiosInstance.get(`/person/${directorId}/movie_credits`, {
                params: { language: "en-US" },
            });

            const movies = response.data.crew
                .filter((movie: any) => movie.job === "Director")
                .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
                .map((movie: any) => ({
                    title: movie.title,
                    year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                    genre: undefined,
                    imdbRating: movie.vote_average,
                    tmdbId: movie.id,
                }));

            this.setCache(cacheKey, movies);
            return movies;
        } catch (error) {
            throw new Error(`Failed to get director movies: ${(error as Error).message}`);
        }
    }

    /**
     * Get popular movies
     */
    async getPopularMovies(page: number = 1): Promise<{ movies: Movie[]; totalPages: number }> {
        const cacheKey = `popular_movies_${page}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse = await this.axiosInstance.get("/movie/popular", {
                params: { language: "en-US", page },
            });

            const result = {
                movies: response.data.results.map((movie: any) => this.formatMovieSearchResult(movie)),
                totalPages: response.data.total_pages,
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            throw new Error(`Failed to get popular movies: ${(error as Error).message}`);
        }
    }

    /**
     * Get top rated movies
     */
    async getTopRatedMovies(page: number = 1): Promise<{ movies: Movie[]; totalPages: number }> {
        const cacheKey = `top_rated_movies_${page}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse = await this.axiosInstance.get("/movie/top_rated", {
                params: { language: "en-US", page },
            });

            const result = {
                movies: response.data.results.map((movie: any) => this.formatMovieSearchResult(movie)),
                totalPages: response.data.total_pages,
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            throw new Error(`Failed to get top rated movies: ${(error as Error).message}`);
        }
    }

    /**
     * Get upcoming movies
     */
    async getUpcomingMovies(page: number = 1): Promise<{ movies: Movie[]; totalPages: number }> {
        const cacheKey = `upcoming_movies_${page}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse = await this.axiosInstance.get("/movie/upcoming", {
                params: { language: "en-US", page },
            });

            const result = {
                movies: response.data.results.map((movie: any) => this.formatMovieSearchResult(movie)),
                totalPages: response.data.total_pages,
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            throw new Error(`Failed to get upcoming movies: ${(error as Error).message}`);
        }
    }

    /**
     * Get movie by IMDB ID
     */
    async getMovieByImdbId(imdbId: string): Promise<Movie | null> {
        const cacheKey = `movie_by_imdb_${imdbId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse = await this.axiosInstance.get(`/find/${imdbId}`, {
                params: {
                    external_source: "imdb_id",
                    language: "en-US",
                },
            });

            if (response.data.movie_results.length > 0) {
                const tmdbId = response.data.movie_results[0].id;
                const movie = await this.getMovieDetails(tmdbId);
                this.setCache(cacheKey, movie);
                return movie;
            }

            return null;
        } catch (error) {
            console.warn(`Failed to get movie by IMDB ID: ${(error as Error).message}`);
            return null;
        }
    }

    // Format helper methods
    private formatMovieSearchResult(movie: any): Movie {
        return {
            imdbId: movie.imdb_id || `tmdb_${movie.id}`,
            tmdbId: movie.id,
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            director: undefined,
            genre: undefined,
            imdbRating: movie.vote_average,
            posterUrl: movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : undefined,
            backdropUrl: movie.backdrop_path ? `${this.backdropBaseUrl}${movie.backdrop_path}` : undefined,
        };
    }

    private formatMovieDetails(movie: TMDBMovieResponse, credits: TMDBCreditsResponse): Movie {
        const director = credits.crew.find((person) => person.job === "Director");
        const cast = credits.cast
            .slice(0, 10)
            .map((actor) => actor.name)
            .join(", ");

        return {
            imdbId: movie.imdb_id || `tmdb_${movie.id}`,
            tmdbId: movie.id,
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
            genre: movie.genres.map((g) => g.name).join(", "),
            director: director ? director.name : undefined,
            plot: movie.overview,
            imdbRating: movie.vote_average,
            runtime: movie.runtime ? `${movie.runtime} min` : undefined,
            actors: cast,
            posterUrl: movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : undefined,
            backdropUrl: movie.backdrop_path ? `${this.backdropBaseUrl}${movie.backdrop_path}` : undefined,
            releaseDate: movie.release_date,
            voteCount: movie.vote_count,
            budget: movie.budget,
            revenue: movie.revenue,
            homepage: movie.homepage,
        };
    }

    private formatActorSearchResult(actor: TMDBPersonResponse): Actor {
        return {
            id: actor.id,
            name: actor.name,
            profilePath: actor.profile_path ? `${this.imageBaseUrl}${actor.profile_path}` : undefined,
            knownFor: actor.known_for?.map((movie) => movie.title || movie.name).join(", "),
        };
    }

    private formatDirectorSearchResult(director: TMDBPersonResponse): Director {
        return {
            id: director.id,
            name: director.name,
            profilePath: director.profile_path ? `${this.imageBaseUrl}${director.profile_path}` : undefined,
            knownFor: director.known_for?.map((movie) => movie.title || movie.name).join(", "),
        };
    }

    private formatActorDetails(person: TMDBPersonResponse): Actor {
        return {
            id: person.id,
            name: person.name,
            birthDate: person.birthday,
            deathDate: person.deathday,
            birthPlace: person.place_of_birth,
            biography: person.biography,
            profilePath: person.profile_path ? `${this.imageBaseUrl}${person.profile_path}` : undefined,
        };
    }

    private formatDirectorDetails(person: TMDBPersonResponse): Director {
        return {
            id: person.id,
            name: person.name,
            birthDate: person.birthday,
            deathDate: person.deathday,
            birthPlace: person.place_of_birth,
            biography: person.biography,
            profilePath: person.profile_path ? `${this.imageBaseUrl}${person.profile_path}` : undefined,
        };
    }

    // Cache management
    private getFromCache(key: string): any {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });

        // Limit cache size
        if (this.cache.size > 1000) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; memoryUsage: number } {
        return {
            size: this.cache.size,
            memoryUsage: JSON.stringify(Array.from(this.cache.values())).length,
        };
    }
}
