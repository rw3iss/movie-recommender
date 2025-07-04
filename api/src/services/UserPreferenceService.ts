import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { DatabaseService } from "./DatabaseService";
import { UserRating, UserPreferences } from "../types";

/**
 * User preference service following Single Responsibility Principle
 * Handles user ratings, preferences, and IMDB import functionality
 */
export class UserPreferenceService {
    constructor(private databaseService: DatabaseService) {}

    /**
     * Save a user rating for a movie
     */
    async saveUserRating(ratingData: UserRating): Promise<void> {
        this.validateRatingData(ratingData);

        const cleanedData: UserRating = {
            ...ratingData,
            dateRated: ratingData.dateRated || new Date(),
            review: ratingData.review?.trim() || undefined,
        };

        await this.databaseService.saveUserRating(cleanedData);
    }

    /**
     * Get all user ratings
     */
    async getUserRatings(): Promise<UserRating[]> {
        return await this.databaseService.getUserRatings();
    }

    /**
     * Get user rating for a specific movie
     */
    async getUserRating(imdbId: string): Promise<UserRating | null> {
        return await this.databaseService.getUserRating(imdbId);
    }

    /**
     * Delete a user rating
     */
    async deleteUserRating(imdbId: string): Promise<void> {
        await this.databaseService.deleteUserRating(imdbId);
    }

    /**
     * Import ratings from IMDB CSV export
     */
    async importIMDBRatings(filePath: string): Promise<number> {
        if (!fs.existsSync(filePath)) {
            throw new Error("IMDB ratings file not found");
        }

        try {
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const records = parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });

            let importedCount = 0;

            for (const record of records) {
                try {
                    const ratingData = this.parseIMDBRecord(record);
                    if (ratingData) {
                        await this.saveUserRating({
                            ...ratingData,
                            source: "imdb_import",
                        });
                        importedCount++;
                    }
                } catch (error) {
                    console.warn(`Failed to import rating for ${record.Title || "unknown"}:`, (error as Error).message);
                }
            }

            return importedCount;
        } catch (error) {
            throw new Error(`Failed to import IMDB ratings: ${(error as Error).message}`);
        }
    }

    /**
     * Parse an IMDB CSV record into our rating format
     */
    private parseIMDBRecord(record: any): UserRating | null {
        // IMDB CSV format: Const,Your Rating,Date Rated,Title,URL,Title Type,IMDb Rating,Runtime (mins),Year,Genres,Num Votes,Release Date,Directors
        // Alternative format: title,year,rating,date

        let imdbId: string;
        let title: string;
        let rating: number;
        let dateRated: Date;
        let year: number | undefined;

        // Try to extract IMDB ID from URL or Const field
        if (record.URL) {
            const urlMatch = record.URL.match(/title\/(tt\d+)/);
            imdbId = urlMatch ? urlMatch[1] : "";
        } else if (record.Const && record.Const.startsWith("tt")) {
            imdbId = record.Const;
        } else {
            imdbId = "";
        }

        // Extract other fields with fallbacks for different CSV formats
        title = record.Title || record.title || record.movie_title;
        rating = parseInt(record["Your Rating"] || record.rating || record.user_rating);
        year = parseInt(record.Year || record.year || record.release_year);

        // Parse date
        const dateStr = record["Date Rated"] || record.date || record.date_rated;
        if (dateStr) {
            dateRated = new Date(dateStr);
            if (isNaN(dateRated.getTime())) {
                dateRated = new Date(); // Fallback to current date
            }
        } else {
            dateRated = new Date();
        }

        // Validate required fields
        if (!title || !rating || rating < 1 || rating > 10) {
            return null;
        }

        // Generate a pseudo-IMDB ID if none found
        if (!imdbId) {
            imdbId = this.generatePseudoImdbId(title, year);
        }

        return {
            imdbId,
            title: title.trim(),
            rating,
            dateRated,
            review: undefined, // IMDB exports typically don't include review text
        };
    }

    /**
     * Generate a pseudo-IMDB ID for movies without one
     */
    private generatePseudoImdbId(title: string, year?: number): string {
        const hash = this.simpleHash(title + (year || ""));
        return `tt${hash.toString().padStart(7, "0")}`;
    }

    /**
     * Simple hash function for generating pseudo-IDs
     */
    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash) % 9999999;
    }

    /**
     * Save user preference
     */
    async saveUserPreference(key: string, value: any): Promise<void> {
        await this.databaseService.saveUserPreference(key, value);
    }

    /**
     * Get user preference
     */
    async getUserPreference(key: string): Promise<any> {
        return await this.databaseService.getUserPreference(key);
    }

    /**
     * Get all user preferences
     */
    async getAllUserPreferences(): Promise<Record<string, any>> {
        return await this.databaseService.getAllUserPreferences();
    }

    /**
     * Analyze user preferences based on ratings
     */
    async analyzeUserPreferences(): Promise<UserPreferences> {
        const ratings = await this.getUserRatings();

        if (ratings.length === 0) {
            return {
                totalRatings: 0,
                averageRating: 0,
                favoriteGenres: [],
                favoriteDirectors: [],
                favoriteDecades: [],
                ratingDistribution: {},
            };
        }

        const analysis: UserPreferences = {
            totalRatings: ratings.length,
            averageRating: this.calculateAverageRating(ratings),
            favoriteGenres: this.analyzeGenrePreferences(ratings),
            favoriteDirectors: this.analyzeDirectorPreferences(ratings),
            favoriteDecades: this.analyzeDecadePreferences(ratings),
            ratingDistribution: this.analyzeRatingDistribution(ratings),
        };

        // Save analysis as preferences
        await this.saveUserPreference("preference_analysis", analysis);

        return analysis;
    }

    /**
     * Calculate average rating
     */
    private calculateAverageRating(ratings: UserRating[]): number {
        const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
        return parseFloat((sum / ratings.length).toFixed(1));
    }

    /**
     * Analyze genre preferences
     */
    private analyzeGenrePreferences(ratings: UserRating[]): Array<{
        genre: string;
        averageRating: number;
        count: number;
    }> {
        const genreMap: Record<string, number[]> = {};

        ratings.forEach((rating) => {
            // Note: We'd need to get genre from the movie record
            // This is a simplified version - in real implementation,
            // we'd join with movies table to get genre data
            const genre = "Unknown"; // Placeholder
            if (!genreMap[genre]) {
                genreMap[genre] = [];
            }
            genreMap[genre].push(rating.rating);
        });

        return Object.keys(genreMap)
            .map((genre) => ({
                genre,
                averageRating: genreMap[genre].reduce((a, b) => a + b, 0) / genreMap[genre].length,
                count: genreMap[genre].length,
            }))
            .filter((item) => item.count >= 2) // Only include genres with at least 2 ratings
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 5);
    }

    /**
     * Analyze director preferences
     */
    private analyzeDirectorPreferences(ratings: UserRating[]): Array<{
        director: string;
        averageRating: number;
        count: number;
    }> {
        const directorMap: Record<string, number[]> = {};

        ratings.forEach((rating) => {
            // Note: Similar to genre analysis, we'd need to join with movies table
            const director = "Unknown"; // Placeholder
            if (!directorMap[director]) {
                directorMap[director] = [];
            }
            directorMap[director].push(rating.rating);
        });

        return Object.keys(directorMap)
            .map((director) => ({
                director,
                averageRating: directorMap[director].reduce((a, b) => a + b, 0) / directorMap[director].length,
                count: directorMap[director].length,
            }))
            .filter((item) => item.count >= 2)
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 5);
    }

    /**
     * Analyze decade preferences
     */
    private analyzeDecadePreferences(ratings: UserRating[]): Array<{
        decade: string;
        averageRating: number;
        count: number;
    }> {
        const decadeMap: Record<string, number[]> = {};

        ratings.forEach((rating) => {
            // Note: We'd need to get year from the movie record
            const year = new Date().getFullYear(); // Placeholder
            const decade = Math.floor(year / 10) * 10;
            const decadeStr = `${decade}s`;

            if (!decadeMap[decadeStr]) {
                decadeMap[decadeStr] = [];
            }
            decadeMap[decadeStr].push(rating.rating);
        });

        return Object.keys(decadeMap)
            .map((decade) => ({
                decade,
                averageRating: decadeMap[decade].reduce((a, b) => a + b, 0) / decadeMap[decade].length,
                count: decadeMap[decade].length,
            }))
            .sort((a, b) => b.averageRating - a.averageRating);
    }

    /**
     * Analyze rating distribution
     */
    private analyzeRatingDistribution(ratings: UserRating[]): Record<number, number> {
        const distribution: Record<number, number> = {};

        for (let i = 1; i <= 10; i++) {
            distribution[i] = 0;
        }

        ratings.forEach((rating) => {
            distribution[rating.rating]++;
        });

        return distribution;
    }

    /**
     * Get top rated movies
     */
    async getTopRatedMovies(limit: number = 10): Promise<UserRating[]> {
        const ratings = await this.getUserRatings();
        return ratings.sort((a, b) => b.rating - a.rating).slice(0, limit);
    }

    /**
     * Get recently rated movies
     */
    async getRecentlyRatedMovies(limit: number = 10): Promise<UserRating[]> {
        const ratings = await this.getUserRatings();
        return ratings
            .sort((a, b) => new Date(b.dateRated).getTime() - new Date(a.dateRated).getTime())
            .slice(0, limit);
    }

    /**
     * Get favorite movies (rating >= 8)
     */
    async getFavoriteMovies(): Promise<UserRating[]> {
        const ratings = await this.getUserRatings();
        return ratings.filter((rating) => rating.rating >= 8).sort((a, b) => b.rating - a.rating);
    }

    /**
     * Get user's rating statistics
     */
    async getUserStats(): Promise<{
        totalRatings: number;
        averageRating: number;
        highestRated: UserRating[];
        lowestRated: UserRating[];
        mostRecentRating: UserRating | null;
    }> {
        const ratings = await this.getUserRatings();

        if (ratings.length === 0) {
            return {
                totalRatings: 0,
                averageRating: 0,
                highestRated: [],
                lowestRated: [],
                mostRecentRating: null,
            };
        }

        const sortedByRating = [...ratings].sort((a, b) => b.rating - a.rating);
        const sortedByDate = [...ratings].sort(
            (a, b) => new Date(b.dateRated).getTime() - new Date(a.dateRated).getTime()
        );

        return {
            totalRatings: ratings.length,
            averageRating: this.calculateAverageRating(ratings),
            highestRated: sortedByRating.filter((r) => r.rating === sortedByRating[0].rating),
            lowestRated: sortedByRating.filter((r) => r.rating === sortedByRating[sortedByRating.length - 1].rating),
            mostRecentRating: sortedByDate[0] || null,
        };
    }

    /**
     * Validate rating data
     */
    private validateRatingData(ratingData: UserRating): void {
        const { imdbId, title, rating } = ratingData;

        if (!imdbId || typeof imdbId !== "string") {
            throw new Error("Valid IMDB ID is required");
        }

        if (!title || typeof title !== "string" || title.trim().length === 0) {
            throw new Error("Movie title is required");
        }

        if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 10) {
            throw new Error("Rating must be an integer between 1 and 10");
        }
    }

    /**
     * Export user ratings to CSV
     */
    async exportRatingsToCSV(): Promise<string> {
        const ratings = await this.getUserRatings();

        const headers = ["Title", "Your Rating", "Date Rated", "Review", "IMDB ID"];
        const csvRows = [headers.join(",")];

        ratings.forEach((rating) => {
            const row = [
                `"${rating.title.replace(/"/g, '""')}"`,
                rating.rating,
                new Date(rating.dateRated).toLocaleDateString(),
                `"${(rating.review || "").replace(/"/g, '""')}"`,
                rating.imdbId,
            ];
            csvRows.push(row.join(","));
        });

        return csvRows.join("\n");
    }
}
