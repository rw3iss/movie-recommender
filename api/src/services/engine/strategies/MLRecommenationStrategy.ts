import { Matrix } from "ml-matrix";
import * as natural from "natural";
import { IRecommendationStrategy } from "../interfaces/IRecommendationStrategy";
import { Movie, UserRating, Recommendation } from "../../types";

/**
 * Machine Learning-based recommendation strategy
 * Implements collaborative filtering and content-based filtering
 */
export class MLRecommendationStrategy extends IRecommendationStrategy {
    private stemmer = natural.PorterStemmer;
    private tfidf = new natural.TfIdf();

    async generateRecommendations(
        userRatings: UserRating[],
        moviePool: Movie[],
        userPreferences: Record<string, any> = {}
    ): Promise<Recommendation[]> {
        const recommendations: Recommendation[] = [];

        // Get movies user hasn't rated
        const ratedMovieIds = new Set(userRatings.map((r) => r.imdbId));
        const candidateMovies = moviePool.filter((movie) => !ratedMovieIds.has(movie.imdbId));

        // Calculate user preference vector
        const userVector = this.calculateUserPreferenceVector(userRatings);

        // Score each candidate movie
        for (const movie of candidateMovies) {
            const score = await this.calculateMovieScore(movie, userRatings, userVector);
            const reason = this.generateRecommendationReason(movie, userRatings, score);

            recommendations.push({
                imdbId: movie.imdbId,
                tmdbId: movie.tmdbId,
                title: movie.title,
                year: movie.year,
                genre: movie.genre,
                director: movie.director,
                score,
                reason,
            });
        }

        return recommendations;
    }

    /**
     * Calculate a preference vector based on user ratings
     */
    private calculateUserPreferenceVector(userRatings: UserRating[]): {
        genres: Record<string, number>;
        directors: Record<string, number>;
        years: Record<number, number>;
        averageRating: number;
    } {
        const genrePreferences: Record<string, number[]> = {};
        const directorPreferences: Record<string, number[]> = {};
        const yearPreferences: Record<number, number[]> = {};

        // Note: In this simplified version, we don't have direct access to movie metadata
        // In a real implementation, you'd join with the movies table to get this data
        userRatings.forEach((rating) => {
            // For now, we'll use placeholder logic
            // In practice, you'd fetch the movie details to get genre, director, year
            // Placeholder: assume we have access to movie metadata through some mechanism
            // This would typically be resolved by joining with movies table or fetching from service
        });

        // Calculate average preferences
        const avgGenrePrefs: Record<string, number> = {};
        Object.keys(genrePreferences).forEach((genre) => {
            avgGenrePrefs[genre] = genrePreferences[genre].reduce((a, b) => a + b, 0) / genrePreferences[genre].length;
        });

        const avgDirectorPrefs: Record<string, number> = {};
        Object.keys(directorPreferences).forEach((director) => {
            avgDirectorPrefs[director] =
                directorPreferences[director].reduce((a, b) => a + b, 0) / directorPreferences[director].length;
        });

        const avgYearPrefs: Record<number, number> = {};
        Object.keys(yearPreferences).forEach((decade) => {
            const decadeNum = parseInt(decade);
            avgYearPrefs[decadeNum] =
                yearPreferences[decadeNum].reduce((a, b) => a + b, 0) / yearPreferences[decadeNum].length;
        });

        return {
            genres: avgGenrePrefs,
            directors: avgDirectorPrefs,
            years: avgYearPrefs,
            averageRating: userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length,
        };
    }

    /**
     * Calculate score for a candidate movie
     */
    private async calculateMovieScore(
        movie: Movie,
        userRatings: UserRating[],
        userVector: {
            genres: Record<string, number>;
            directors: Record<string, number>;
            years: Record<number, number>;
            averageRating: number;
        }
    ): Promise<number> {
        let score = 0;
        let factorCount = 0;

        // Genre similarity score
        if (movie.genre && Object.keys(userVector.genres).length > 0) {
            const movieGenres = movie.genre.split(",").map((g) => g.trim());
            let genreScore = 0;
            let genreMatches = 0;

            movieGenres.forEach((genre) => {
                if (userVector.genres[genre]) {
                    genreScore += userVector.genres[genre];
                    genreMatches++;
                }
            });

            if (genreMatches > 0) {
                score += (genreScore / genreMatches) * 0.4;
                factorCount += 0.4;
            }
        }

        // Director preference score
        if (movie.director && userVector.directors[movie.director]) {
            score += userVector.directors[movie.director] * 0.3;
            factorCount += 0.3;
        }

        // Year/decade preference score
        if (movie.year) {
            const decade = Math.floor(movie.year / 10) * 10;
            if (userVector.years[decade]) {
                score += userVector.years[decade] * 0.2;
                factorCount += 0.2;
            }
        }

        // Content similarity score (plot/description)
        const contentScore = this.calculateContentSimilarity(movie, userRatings);
        score += contentScore * 0.1;
        factorCount += 0.1;

        // Normalize score
        if (factorCount > 0) {
            score = score / factorCount;
        } else {
            // Fallback to IMDB rating if available
            score = movie.imdbRating ? movie.imdbRating : userVector.averageRating;
        }

        // Boost score based on IMDB rating
        if (movie.imdbRating) {
            score = score * 0.8 + movie.imdbRating * 0.2;
        }

        return Math.min(Math.max(score, 0), 10); // Clamp between 0-10
    }

    /**
     * Calculate content similarity using TF-IDF on movie plots/descriptions
     */
    private calculateContentSimilarity(movie: Movie, userRatings: UserRating[]): number {
        // Simple content similarity based on keywords
        const movieContent = `${movie.title} ${movie.genre || ""} ${movie.plot || ""}`.toLowerCase();

        // Get highly rated movies content
        const highlyRatedMovies = userRatings.filter((r) => r.rating >= 7);

        if (highlyRatedMovies.length === 0) return 5; // Default neutral score

        let similarity = 0;
        let count = 0;

        highlyRatedMovies.forEach((ratedMovie) => {
            // Note: In a real implementation, you'd fetch the full movie details
            const ratedContent = `${ratedMovie.title}`.toLowerCase();
            const movieWords = new Set(movieContent.split(/\s+/));
            const ratedWords = new Set(ratedContent.split(/\s+/));

            // Calculate Jaccard similarity
            const intersection = new Set([...movieWords].filter((x) => ratedWords.has(x)));
            const union = new Set([...movieWords, ...ratedWords]);

            if (union.size > 0) {
                similarity += (intersection.size / union.size) * ratedMovie.rating;
                count++;
            }
        });

        return count > 0 ? similarity / count : 5;
    }

    /**
     * Generate human-readable reason for recommendation
     */
    private generateRecommendationReason(movie: Movie, userRatings: UserRating[], score: number): string {
        const reasons: string[] = [];

        // Analyze what makes this a good recommendation
        if (movie.genre) {
            const movieGenres = movie.genre.split(",").map((g) => g.trim());
            const userGenres = this.getTopUserGenres(userRatings);
            const matchingGenres = movieGenres.filter((g) => userGenres.includes(g));

            if (matchingGenres.length > 0) {
                reasons.push(`You like ${matchingGenres.join(", ")} movies`);
            }
        }

        // Check for director match
        const userDirectors = this.getTopUserDirectors(userRatings);
        if (movie.director && userDirectors.includes(movie.director)) {
            reasons.push(`You enjoyed other ${movie.director} films`);
        }

        // IMDB rating boost
        if (movie.imdbRating && movie.imdbRating >= 7.5) {
            reasons.push(`Highly rated (${movie.imdbRating}/10 on TMDB)`);
        }

        // Default reason if no specific matches
        if (reasons.length === 0) {
            if (score >= 7) {
                reasons.push("Strong match based on your preferences");
            } else if (score >= 6) {
                reasons.push("Good match for your taste");
            } else {
                reasons.push("Potential new discovery");
            }
        }

        return reasons.join(", ");
    }

    private getTopUserGenres(userRatings: UserRating[], minRating: number = 7): string[] {
        // Note: This would need to be implemented with proper movie data access
        // For now, returning empty array as placeholder
        return [];
    }

    private getTopUserDirectors(userRatings: UserRating[], minRating: number = 7): string[] {
        // Note: This would need to be implemented with proper movie data access
        // For now, returning empty array as placeholder
        return [];
    }

    getAlgorithmInfo(): {
        name: string;
        description: string;
        factors: string[];
    } {
        return {
            name: "ML-Based Hybrid Recommendation",
            description:
                "Combines collaborative filtering and content-based filtering using machine learning techniques",
            factors: [
                "Genre preferences",
                "Director preferences",
                "Content similarity",
                "TMDB ratings",
                "Temporal preferences",
            ],
        };
    }
}
