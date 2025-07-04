import { Movie, UserRating, Recommendation, UserPreferences } from "../../../types";

/**
 * Interface for recommendation strategies following Interface Segregation Principle
 * All recommendation algorithms must implement this interface
 */
export abstract class IRecommendationStrategy {
    /**
     * Generate movie recommendations
     * @param userRatings - User's rated movies with scores
     * @param moviePool - Available movies to recommend from
     * @param userPreferences - Additional user preference data
     * @returns Array of recommended movies with scores and reasons
     */
    abstract generateRecommendations(
        userRatings: UserRating[],
        moviePool: Movie[],
        userPreferences: Record<string, any>
    ): Promise<Recommendation[]>;

    /**
     * Get information about the recommendation algorithm
     * @returns Algorithm metadata
     */
    abstract getAlgorithmInfo(): {
        name: string;
        description: string;
        factors: string[];
    };
}
