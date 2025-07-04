import { IRecommendationStrategy } from "./interfaces/IRecommendationStrategy";
import { Movie, UserRating, Recommendation, UserPreferences } from "../types";

/**
 * Recommendation Engine following Strategy Pattern and Dependency Inversion Principle
 * Uses pluggable strategies for different recommendation algorithms
 */
export class RecommendationEngine {
    constructor(private strategy: IRecommendationStrategy) {}

    /**
     * Set a different recommendation strategy
     */
    setStrategy(strategy: IRecommendationStrategy): void {
        this.strategy = strategy;
    }

    /**
     * Generate movie recommendations based on user data
     */
    async generateRecommendations(
        userRatings: UserRating[],
        moviePool: Movie[],
        userPreferences: UserPreferences | null = null
    ): Promise<Recommendation[]> {
        if (!this.strategy) {
            throw new Error("No recommendation strategy set");
        }

        if (!userRatings || userRatings.length === 0) {
            throw new Error("User ratings are required for recommendations");
        }

        if (!moviePool || moviePool.length === 0) {
            throw new Error("Movie pool is required for recommendations");
        }

        try {
            const recommendations = await this.strategy.generateRecommendations(
                userRatings,
                moviePool,
                userPreferences || {}
            );

            // Sort by score and limit to top recommendations
            return recommendations
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((rec, index) => ({
                    ...rec,
                    rank: index + 1,
                }));
        } catch (error) {
            throw new Error(`Recommendation generation failed: ${(error as Error).message}`);
        }
    }

    /**
     * Get algorithm information
     */
    getAlgorithmInfo(): {
        name: string;
        description: string;
        factors: string[];
    } {
        return this.strategy.getAlgorithmInfo();
    }

    /**
     * Generate recommendations for a specific genre
     */
    async generateGenreRecommendations(
        userRatings: UserRating[],
        moviePool: Movie[],
        targetGenre: string,
        limit: number = 5
    ): Promise<Recommendation[]> {
        // Filter movies by genre
        const genreMovies = moviePool.filter(
            (movie) => movie.genre && movie.genre.toLowerCase().includes(targetGenre.toLowerCase())
        );

        if (genreMovies.length === 0) {
            return [];
        }

        const recommendations = await this.generateRecommendations(userRatings, genreMovies, null);

        return recommendations.slice(0, limit);
    }

    /**
     * Generate recommendations for a specific director
     */
    async generateDirectorRecommendations(
        userRatings: UserRating[],
        moviePool: Movie[],
        targetDirector: string,
        limit: number = 5
    ): Promise<Recommendation[]> {
        // Filter movies by director
        const directorMovies = moviePool.filter(
            (movie) => movie.director && movie.director.toLowerCase().includes(targetDirector.toLowerCase())
        );

        if (directorMovies.length === 0) {
            return [];
        }

        const recommendations = await this.generateRecommendations(userRatings, directorMovies, null);

        return recommendations.slice(0, limit);
    }

    /**
     * Generate recommendations for a specific decade
     */
    async generateDecadeRecommendations(
        userRatings: UserRating[],
        moviePool: Movie[],
        decade: number,
        limit: number = 5
    ): Promise<Recommendation[]> {
        // Filter movies by decade
        const decadeMovies = moviePool.filter((movie) => {
            if (!movie.year) return false;
            const movieDecade = Math.floor(movie.year / 10) * 10;
            return movieDecade === decade;
        });

        if (decadeMovies.length === 0) {
            return [];
        }

        const recommendations = await this.generateRecommendations(userRatings, decadeMovies, null);

        return recommendations.slice(0, limit);
    }

    /**
     * Generate diverse recommendations (different genres, directors, decades)
     */
    async generateDiverseRecommendations(
        userRatings: UserRating[],
        moviePool: Movie[],
        limit: number = 10
    ): Promise<Recommendation[]> {
        const baseRecommendations = await this.generateRecommendations(userRatings, moviePool, null);

        // Diversify by ensuring we don't have too many movies from the same genre/director
        const diversifiedRecommendations: Recommendation[] = [];
        const genreCounts: Record<string, number> = {};
        const directorCounts: Record<string, number> = {};

        for (const rec of baseRecommendations) {
            // Find the movie details
            const movie = moviePool.find((m) => m.imdbId === rec.imdbId);
            if (!movie) continue;

            // Check diversity constraints
            const genres = movie.genre ? movie.genre.split(",").map((g) => g.trim()) : [];
            const director = movie.director || "Unknown";

            let shouldInclude = true;

            // Limit movies per genre (max 3 per genre)
            for (const genre of genres) {
                if ((genreCounts[genre] || 0) >= 3) {
                    shouldInclude = false;
                    break;
                }
            }

            // Limit movies per director (max 2 per director)
            if (shouldInclude && (directorCounts[director] || 0) >= 2) {
                shouldInclude = false;
            }

            if (shouldInclude) {
                diversifiedRecommendations.push(rec);

                // Update counts
                genres.forEach((genre) => {
                    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
                });
                directorCounts[director] = (directorCounts[director] || 0) + 1;

                if (diversifiedRecommendations.length >= limit) {
                    break;
                }
            }
        }

        return diversifiedRecommendations;
    }

    /**
     * Generate recommendations based on similar users (collaborative filtering)
     */
    async generateCollaborativeRecommendations(
        userRatings: UserRating[],
        allUserRatings: UserRating[][],
        moviePool: Movie[],
        limit: number = 10
    ): Promise<Recommendation[]> {
        // This is a simplified collaborative filtering implementation
        // In a real system, you'd use more sophisticated algorithms

        if (allUserRatings.length < 2) {
            // Fall back to content-based if not enough users
            return this.generateRecommendations(userRatings, moviePool);
        }

        // Find similar users based on common rated movies
        const similarUsers = this.findSimilarUsers(userRatings, allUserRatings);

        // Get movies highly rated by similar users that current user hasn't seen
        const userMovieIds = new Set(userRatings.map((r) => r.imdbId));
        const candidateMovies: { imdbId: string; avgRating: number; count: number }[] = [];

        similarUsers.forEach(({ ratings, similarity }) => {
            ratings.forEach((rating) => {
                if (!userMovieIds.has(rating.imdbId) && rating.rating >= 7) {
                    const existing = candidateMovies.find((c) => c.imdbId === rating.imdbId);
                    if (existing) {
                        existing.avgRating =
                            (existing.avgRating * existing.count + rating.rating * similarity) /
                            (existing.count + similarity);
                        existing.count += similarity;
                    } else {
                        candidateMovies.push({
                            imdbId: rating.imdbId,
                            avgRating: rating.rating * similarity,
                            count: similarity,
                        });
                    }
                }
            });
        });

        // Convert to recommendations
        const recommendations: Recommendation[] = candidateMovies
            .filter((c) => c.count >= 1) // Must be recommended by at least one similar user
            .sort((a, b) => b.avgRating - a.avgRating)
            .slice(0, limit)
            .map((candidate, index) => {
                const movie = moviePool.find((m) => m.imdbId === candidate.imdbId);
                return {
                    imdbId: candidate.imdbId,
                    tmdbId: movie?.tmdbId,
                    title: movie?.title || "Unknown",
                    year: movie?.year,
                    genre: movie?.genre,
                    director: movie?.director,
                    score: candidate.avgRating,
                    reason: `Recommended by users with similar taste (${candidate.count.toFixed(1)} similarity score)`,
                    rank: index + 1,
                };
            });

        return recommendations;
    }

    /**
     * Find users with similar rating patterns
     */
    private findSimilarUsers(
        userRatings: UserRating[],
        allUserRatings: UserRating[][]
    ): Array<{ ratings: UserRating[]; similarity: number }> {
        const userMovieMap = new Map(userRatings.map((r) => [r.imdbId, r.rating]));

        return allUserRatings
            .map((otherUserRatings) => {
                const commonMovies: Array<{ userRating: number; otherRating: number }> = [];

                otherUserRatings.forEach((rating) => {
                    const userRating = userMovieMap.get(rating.imdbId);
                    if (userRating !== undefined) {
                        commonMovies.push({ userRating, otherRating: rating.rating });
                    }
                });

                if (commonMovies.length < 3) {
                    return { ratings: otherUserRatings, similarity: 0 };
                }

                // Calculate Pearson correlation coefficient
                const similarity = this.calculatePearsonCorrelation(commonMovies);

                return { ratings: otherUserRatings, similarity };
            })
            .filter((user) => user.similarity > 0.3) // Only include users with reasonable similarity
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 10); // Top 10 similar users
    }

    /**
     * Calculate Pearson correlation coefficient
     */
    private calculatePearsonCorrelation(pairs: Array<{ userRating: number; otherRating: number }>): number {
        const n = pairs.length;
        if (n === 0) return 0;

        const sumUser = pairs.reduce((sum, pair) => sum + pair.userRating, 0);
        const sumOther = pairs.reduce((sum, pair) => sum + pair.otherRating, 0);
        const sumUserSq = pairs.reduce((sum, pair) => sum + pair.userRating ** 2, 0);
        const sumOtherSq = pairs.reduce((sum, pair) => sum + pair.otherRating ** 2, 0);
        const sumProducts = pairs.reduce((sum, pair) => sum + pair.userRating * pair.otherRating, 0);

        const numerator = sumProducts - (sumUser * sumOther) / n;
        const denominator = Math.sqrt((sumUserSq - sumUser ** 2 / n) * (sumOtherSq - sumOther ** 2 / n));

        return denominator === 0 ? 0 : numerator / denominator;
    }
}
