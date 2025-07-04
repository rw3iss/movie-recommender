import axios, { AxiosResponse } from "axios";
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
    }>;
    crew: Array<{
        id: number;
        name: string;
        job: string;
    }>;
}

/**
 * TMDB service for fetching movie, actor, and director data
 * Uses The Movie Database (TMDB) API for comprehensive movie information
 */
export class TMDBService {
    private apiKey: string;
    private readAccessToken: string;
    private baseUrl: string = "https://api.themoviedb.org/3";
    private imageBaseUrl: string = "https://image.tmdb.org/t/p/w500";
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private cacheTimeout: number = 1000 * 60 * 60; // 1 hour

    constructor(apiKey: string, readAccessToken: string) {
        this.apiKey = apiKey;
        this.readAccessToken = readAccessToken;
    }

    /**
     * Get authorization headers for TMDB API
     */
    private getAuthHeaders(): Record<string, string> {
        return {
            Authorization: `Bearer ${this.readAccessToken}`,
            "Content-Type": "application/json;charset=utf-8",
        };
    }

    /**
     * Search for movies by title
     */
    async searchMovies(query: string, page: number = 1): Promise<Movie[]> {
        const cacheKey = `search_movies_${query.toLowerCase()}_${page}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse = await axios.get(`${this.baseUrl}/search/movie`, {
                headers: this.getAuthHeaders(),
                params: {
                    query: query,
                    page: page,
                    include_adult: false,
                    language: "en-US",
                },
                timeout: 10000,
            });

            const movies = response.data.results.map((movie: any) => this.formatMovieSearchResult(movie));
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
            const actors = await this.searchActors(actorName);
            if (actors.length === 0) return [];

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
            const directors = await this.searchDirectors(directorName);
            if (directors.length === 0) return [];

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
    async searchActors(query: string): Promise<Actor[]> {
        const cacheKey = `search_actors_${query.toLowerCase()}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse = await axios.get(`${this.baseUrl}/search/person`, {
                headers: this.getAuthHeaders(),
                params: {
                    query: query,
                    include_adult: false,
                    language: "en-US",
                },
                timeout: 10000,
            });

            const actors = response.data.results
                .filter((person: TMDBPersonResponse) => person.known_for_department === "Acting")
                .map((actor: TMDBPersonResponse) => this.formatActorSearchResult(actor));

            this.setCache(cacheKey, actors);
            return actors;
        } catch (error) {
            throw new Error(`Failed to search actors: ${(error as Error).message}`);
        }
    }

    /**
     * Search for directors
     */
    async searchDirectors(query: string): Promise<Director[]> {
        const cacheKey = `search_directors_${query.toLowerCase()}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            const response: AxiosResponse = await axios.get(`${this.baseUrl}/search/person`, {
                headers: this.getAuthHeaders(),
                params: {
                    query: query,
                    include_adult: false,
                    language: "en-US",
                },
                timeout: 10000,
            });

            const directors = response.data.results
                .filter((person: TMDBPersonResponse) => person.known_for_department === "Directing")
                .map((director: TMDBPersonResponse) => this.formatDirectorSearchResult(director));

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
                axios.get(`${this.baseUrl}/movie/${tmdbId}`, {
                    headers: this.getAuthHeaders(),
                    params: { language: "en-US" },
                }),
                axios.get(`${this.baseUrl}/movie/${tmdbId}/credits`, {
                    headers: this.getAuthHeaders(),
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
        try {
            const [personResponse, creditsResponse] = await Promise.all([
                axios.get(`${this.baseUrl}/person/${actorId}`, {
                    headers: this.getAuthHeaders(),
                    params: { language: "en-US" },
                }),
                axios.get(`${this.baseUrl}/person/${actorId}/movie_credits`, {
                    headers: this.getAuthHeaders(),
                    params: { language: "en-US" },
                }),
            ]);

            return {
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
        } catch (error) {
            throw new Error(`Failed to get actor details: ${(error as Error).message}`);
        }
    }

    /**
     * Get director details and filmography
     */
    async getDirectorDetails(directorId: number): Promise<{ director: Director; movies: DirectorMovie[] }> {
        try {
            const [personResponse, creditsResponse] = await Promise.all([
                axios.get(`${this.baseUrl}/person/${directorId}`, {
                    headers: this.getAuthHeaders(),
                    params: { language: "en-US" },
                }),
                axios.get(`${this.baseUrl}/person/${directorId}/movie_credits`, {
                    headers: this.getAuthHeaders(),
                    params: { language: "en-US" },
                }),
            ]);

            return {
                director: this.formatDirectorDetails(personResponse.data),
                movies: creditsResponse.data.crew
                    .filter((movie: any) => movie.job === "Director")
                    .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
                    .slice(0, 20)
                    .map((movie: any) => ({
                        title: movie.title,
                        year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                        genre: undefined,
                        imdbRating: movie.vote_average || "N/A",
                        tmdbId: movie.id,
                    })),
            };
        } catch (error) {
            throw new Error(`Failed to get director details: ${(error as Error).message}`);
        }
    }

    /**
     * Get similar movies
     */
    async getSimilarMovies(tmdbId: number): Promise<Movie[]> {
        try {
            const response: AxiosResponse = await axios.get(`${this.baseUrl}/movie/${tmdbId}/similar`, {
                headers: this.getAuthHeaders(),
                params: { language: "en-US", page: 1 },
            });

            return response.data.results.slice(0, 5).map((movie: any) => ({
                imdbId: `tmdb_${movie.id}`,
                tmdbId: movie.id,
                title: movie.title,
                year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                imdbRating: movie.vote_average || undefined,
                posterUrl: movie.poster_path ? `${this.imageBaseUrl}${movie.poster_path}` : undefined,
            }));
        } catch (error) {
            console.warn("Failed to get similar movies:", (error as Error).message);
            return [];
        }
    }

    /**
     * Get actor's movie credits
     */
    async getActorMovies(actorId: number): Promise<ActorMovie[]> {
        try {
            const response: AxiosResponse = await axios.get(`${this.baseUrl}/person/${actorId}/movie_credits`, {
                headers: this.getAuthHeaders(),
                params: { language: "en-US" },
            });

            return response.data.cast
                .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
                .map((movie: any) => ({
                    title: movie.title,
                    year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                    role: movie.character,
                    imdbRating: movie.vote_average,
                    tmdbId: movie.id,
                }));
        } catch (error) {
            throw new Error(`Failed to get actor movies: ${(error as Error).message}`);
        }
    }

    /**
     * Get director's movie credits
     */
    async getDirectorMovies(directorId: number): Promise<DirectorMovie[]> {
        try {
            const response: AxiosResponse = await axios.get(`${this.baseUrl}/person/${directorId}/movie_credits`, {
                headers: this.getAuthHeaders(),
                params: { language: "en-US" },
            });

            return response.data.crew
                .filter((movie: any) => movie.job === "Director")
                .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0))
                .map((movie: any) => ({
                    title: movie.title,
                    year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
                    genre: undefined,
                    imdbRating: movie.vote_average,
                    tmdbId: movie.id,
                }));
        } catch (error) {
            throw new Error(`Failed to get director movies: ${(error as Error).message}`);
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
            backdropUrl: movie.backdrop_path ? `${this.imageBaseUrl}${movie.backdrop_path}` : undefined,
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
    }

    clearCache(): void {
        this.cache.clear();
    }
}
