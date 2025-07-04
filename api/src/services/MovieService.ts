import { DatabaseService } from "./DatabaseService";
import { TMDBService } from "./TMDBService";
import { Movie, SearchOptions } from "../types";

/**
 * Movie service following Single Responsibility Principle
 * Handles movie-related business logic and coordinates between database and TMDB API
 */
export class MovieService {
    constructor(private databaseService: DatabaseService, private tmdbService: TMDBService) {}

    /**
     * Enhanced search for movies prioritizing TMDB API, with type and sorting options
     */
    async searchMovies(
        query: string,
        type: "title" | "director" | "actor" = "title",
        options: SearchOptions = {}
    ): Promise<Movie[]> {
        const sortBy = options.sort || "title";

        // Always search TMDB API first (case-insensitive)
        try {
            let remoteResults: Movie[] = [];

            if (type === "title") {
                remoteResults = await this.tmdbService.searchMovies(query);
            } else if (type === "director") {
                remoteResults = await this.tmdbService.searchMoviesByDirector(query);
            } else if (type === "actor") {
                remoteResults = await this.tmdbService.searchMoviesByActor(query);
            }

            // Get full details for each movie and save to local database
            const enrichedResults: Movie[] = [];
            for (const movie of remoteResults.slice(0, 20)) {
                try {
                    let details: Movie;
                    if (movie.tmdbId) {
                        details = await this.tmdbService.getMovieDetails(movie.tmdbId);
                    } else {
                        details = movie;
                    }

                    // Save to local database for future reference and ratings
                    await this.databaseService.saveMovie(details);
                    enrichedResults.push(details);
                } catch (error) {
                    // If we can't get details, add basic info
                    enrichedResults.push(movie);
                }
            }

            return this.sortMovies(enrichedResults, sortBy);
        } catch (error) {
            console.warn("TMDB API search failed, falling back to local database:", error);

            // Fallback to local database only if remote search fails
            let localResults: Movie[] = [];
            switch (type) {
                case "director":
                    localResults = await this.databaseService.searchMoviesByDirector(query);
                    break;
                case "actor":
                    localResults = await this.databaseService.searchMoviesByActor(query);
                    break;
                default:
                    localResults = await this.databaseService.searchMovies(query);
            }

            return this.sortMovies(localResults, sortBy);
        }
    }

    /**
     * Get movie details, checking database first, then fetching from TMDB if needed
     */
    async getOrFetchMovieDetails(movieId: string): Promise<Movie | null> {
        // Check database first
        let movie = await this.databaseService.getMovie(movieId);

        if (movie) {
            return movie;
        }

        // Try to fetch from TMDB if it looks like a TMDB ID
        if (movieId.toString().startsWith("tmdb_")) {
            const tmdbId = movieId.replace("tmdb_", "");
            try {
                const movieData = await this.tmdbService.getMovieDetails(parseInt(tmdbId));

                // Save to database for future use
                await this.databaseService.saveMovie(movieData);

                return movieData;
            } catch (error) {
                throw new Error(`Failed to get movie details for TMDB ID ${tmdbId}: ${(error as Error).message}`);
            }
        }

        return null;
    }

    /**
     * Get movie by title and year using TMDB
     */
    async getMovieByTitle(title: string, year?: number): Promise<Movie | null> {
        // Try database first
        const dbResults = await this.databaseService.searchMovies(title);

        // Look for exact or close match
        const exactMatch = dbResults.find((movie) => {
            const titleMatch = movie.title.toLowerCase() === title.toLowerCase();
            const yearMatch = !year || movie.year === year;
            return titleMatch && yearMatch;
        });

        if (exactMatch) {
            return exactMatch;
        }

        // Search TMDB
        try {
            const searchResults = await this.tmdbService.searchMovies(title);

            let targetMovie = searchResults[0]; // Get first result

            // If year is specified, try to find exact year match
            if (year) {
                const yearMatch = searchResults.find((movie) => movie.year === year);
                if (yearMatch) {
                    targetMovie = yearMatch;
                }
            }

            if (targetMovie && targetMovie.tmdbId) {
                const movieData = await this.tmdbService.getMovieDetails(targetMovie.tmdbId);

                // Save to database
                await this.databaseService.saveMovie(movieData);
                return movieData;
            }

            return null;
        } catch (error) {
            throw new Error(`Failed to get movie by title: ${(error as Error).message}`);
        }
    }

    /**
     * Get all movies from database
     */
    async getAllMovies(): Promise<Movie[]> {
        return await this.databaseService.getAllMovies();
    }

    /**
     * Save a movie to the database
     */
    async saveMovie(movieData: Movie): Promise<void> {
        return await this.databaseService.saveMovie(movieData);
    }

    /**
     * Bulk import movies from an array
     */
    async bulkImportMovies(movies: Movie[]): Promise<number> {
        let importedCount = 0;

        for (const movieData of movies) {
            try {
                await this.databaseService.saveMovie(movieData);
                importedCount++;
            } catch (error) {
                console.warn(`Failed to import movie ${movieData.title}:`, (error as Error).message);
            }
        }

        return importedCount;
    }

    /**
     * Enrich existing movie data with additional details from TMDB
     */
    async enrichMovieData(movieId: string): Promise<Movie | null> {
        try {
            if (movieId.toString().startsWith("tmdb_")) {
                const tmdbId = movieId.replace("tmdb_", "");
                const freshData = await this.tmdbService.getMovieDetails(parseInt(tmdbId));
                await this.databaseService.saveMovie(freshData);
                return freshData;
            }

            // For IMDB IDs, we'd need to search TMDB first to find the movie
            const searchResults = await this.tmdbService.searchMovies(movieId);
            if (searchResults.length > 0 && searchResults[0].tmdbId) {
                const freshData = await this.tmdbService.getMovieDetails(searchResults[0].tmdbId);
                await this.databaseService.saveMovie(freshData);
                return freshData;
            }

            return null;
        } catch (error) {
            throw new Error(`Failed to enrich movie data: ${(error as Error).message}`);
        }
    }

    /**
     * Get movie statistics
     */
    async getMovieStatistics(): Promise<any> {
        return await this.databaseService.getStatistics();
    }

    /**
     * Sort movies by specified criteria
     */
    private sortMovies(movies: Movie[], sortBy: string): Movie[] {
        switch (sortBy) {
            case "date":
            case "year":
                return movies.sort((a, b) => (b.year || 0) - (a.year || 0));
            case "rating":
                return movies.sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0));
            case "title":
            default:
                return movies.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        }
    }

    /**
     * Remove duplicate movies from array based on IMDB ID
     */
    private deduplicateMovies(movies: Movie[]): Movie[] {
        const seen = new Set<string>();
        return movies.filter((movie) => {
            if (seen.has(movie.imdbId)) {
                return false;
            }
            seen.add(movie.imdbId);
            return true;
        });
    }

    /**
     * Validate movie data structure
     */
    validateMovieData(movieData: Movie): boolean {
        const required = ["imdbId", "title"];
        return required.every(
            (field) => movieData[field as keyof Movie] && String(movieData[field as keyof Movie]).trim().length > 0
        );
    }

    /**
     * Clean and normalize movie data
     */
    cleanMovieData(movieData: Movie): Movie {
        const cleaned = { ...movieData };

        // Normalize string fields
        const stringFields: (keyof Movie)[] = ["title", "genre", "director", "plot", "actors"];
        stringFields.forEach((field) => {
            if (cleaned[field] && typeof cleaned[field] === "string") {
                cleaned[field] = (cleaned[field] as string).trim() as any;
                if (cleaned[field] === "N/A" || cleaned[field] === "") {
                    cleaned[field] = undefined as any;
                }
            }
        });

        // Normalize numeric fields
        if (cleaned.year) {
            const year = parseInt(String(cleaned.year));
            cleaned.year = isNaN(year) ? undefined : year;
        }

        if (cleaned.imdbRating) {
            const rating = parseFloat(String(cleaned.imdbRating));
            cleaned.imdbRating = isNaN(rating) ? undefined : rating;
        }

        return cleaned;
    }

    /**
     * Get similar movies using TMDB
     */
    async getSimilarMovies(movieId: string): Promise<Movie[]> {
        try {
            // Try to get TMDB ID
            let tmdbId: number | undefined;

            if (movieId.startsWith("tmdb_")) {
                tmdbId = parseInt(movieId.replace("tmdb_", ""));
            } else {
                // Look up in database to get TMDB ID
                const movie = await this.databaseService.getMovie(movieId);
                tmdbId = movie?.tmdbId;
            }

            if (tmdbId) {
                return await this.tmdbService.getSimilarMovies(tmdbId);
            }

            // Fallback to basic similarity from database
            return this.getBasicSimilarMovies(movieId);
        } catch (error) {
            console.warn("Failed to get similar movies from TMDB:", error);
            return this.getBasicSimilarMovies(movieId);
        }
    }

    /**
     * Basic similarity based on genre and director (fallback)
     */
    private async getBasicSimilarMovies(movieId: string): Promise<Movie[]> {
        try {
            const movie = await this.databaseService.getMovie(movieId);
            if (!movie) return [];

            const allMovies = await this.databaseService.getAllMovies();

            return allMovies
                .filter((m) => m.imdbId !== movie.imdbId)
                .filter((m) => {
                    // Match by genre or director
                    const genreMatch =
                        movie.genre && m.genre && movie.genre.split(",").some((g) => m.genre?.includes(g.trim()));
                    const directorMatch = movie.director && m.director === movie.director;
                    return genreMatch || directorMatch;
                })
                .sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0))
                .slice(0, 5);
        } catch (error) {
            console.warn("Failed to get basic similar movies:", error);
            return [];
        }
    }
}
