import { FastifyRequest, FastifyReply } from "fastify";
import { MovieService } from "../services/MovieService";
import { RecommendationEngine } from "../services/engine/RecommendationEngine";
import { Errors } from "../utils/errorHandler";
import {
    MovieSearchParams,
    MovieDetailsParams,
    MovieFilters,
    PaginationQuery,
    MovieRatingBody,
} from "../types/movie.types";

/**
 * Movie controller handling movie-related endpoints
 */
export class MovieController {
    constructor(private movieService: MovieService, private recommendationEngine: RecommendationEngine) {}

    /**
     * Search movies with filters
     * @route GET /api/v1/movies/search
     */
    async searchMovies(
        request: FastifyRequest<{
            Querystring: MovieSearchParams & MovieFilters & PaginationQuery;
        }>,
        reply: FastifyReply
    ) {
        try {
            const { query, page = 1, limit = 20, ...filters } = request.query;

            const results = await this.movieService.searchMovies(query, filters, {
                page,
                limit,
            });

            reply.send({
                results: results.movies,
                pagination: {
                    page,
                    limit,
                    total: results.total,
                    totalPages: Math.ceil(results.total / limit),
                },
                filters: results.availableFilters,
            });
        } catch (error) {
            throw Errors.internal("Failed to search movies");
        }
    }

    /**
     * Get movie details by ID
     * @route GET /api/v1/movies/:id
     */
    async getMovieDetails(request: FastifyRequest<{ Params: MovieDetailsParams }>, reply: FastifyReply) {
        try {
            const { id } = request.params;

            const movie = await this.movieService.getMovieDetails(id);

            if (!movie) {
                throw Errors.notFound("Movie");
            }

            // Add user-specific data if authenticated
            if (request.user) {
                const userRating = await this.movieService.getUserRating(request.user.userId, id);
                if (userRating) {
                    movie.userRating = userRating.rating;
                    movie.userNotes = userRating.notes;
                    movie.watchedDate = userRating.dateRated;
                }

                const userLists = await this.movieService.getMovieLists(request.user.userId, id);
                movie.lists = userLists;
            }

            reply.send(movie);
        } catch (error) {
            if (error instanceof Error && error.message.includes("not found")) {
                throw Errors.notFound("Movie");
            }
            throw error;
        }
    }

    /**
     * Get similar movies
     * @route GET /api/v1/movies/:id/similar
     */
    async getSimilarMovies(
        request: FastifyRequest<{
            Params: MovieDetailsParams;
            Querystring: PaginationQuery;
        }>,
        reply: FastifyReply
    ) {
        try {
            const { id } = request.params;
            const { page = 1, limit = 20 } = request.query;

            const similar = await this.movieService.getSimilarMovies(id, {
                page,
                limit,
            });

            reply.send({
                results: similar,
                pagination: {
                    page,
                    limit,
                    total: similar.length,
                },
            });
        } catch (error) {
            throw Errors.internal("Failed to get similar movies");
        }
    }

    /**
     * Get movie recommendations for user
     * @route GET /api/v1/movies/recommendations
     */
    async getRecommendations(request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) {
        try {
            if (!request.user) {
                throw Errors.unauthorized();
            }

            const { page = 1, limit = 20 } = request.query;

            const recommendations = await this.recommendationEngine.getRecommendations(request.user.userId, {
                page,
                limit,
            });

            reply.send({
                results: recommendations,
                pagination: {
                    page,
                    limit,
                    total: recommendations.length,
                },
            });
        } catch (error) {
            throw Errors.internal("Failed to get recommendations");
        }
    }

    /**
     * Rate a movie
     * @route POST /api/v1/movies/:id/rate
     */
    async rateMovie(
        request: FastifyRequest<{
            Params: MovieDetailsParams;
            Body: MovieRatingBody;
        }>,
        reply: FastifyReply
    ) {
        try {
            if (!request.user) {
                throw Errors.unauthorized();
            }

            const { id } = request.params;
            const { rating, notes } = request.body;

            await this.movieService.rateMovie(request.user.userId, id, rating, notes);

            reply.status(201).send({
                message: "Movie rated successfully",
                rating: { movieId: id, rating, notes },
            });
        } catch (error) {
            throw Errors.internal("Failed to rate movie");
        }
    }

    /**
     * Get popular movies
     * @route GET /api/v1/movies/popular
     */
    async getPopularMovies(request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) {
        try {
            const { page = 1, limit = 20 } = request.query;

            const popular = await this.movieService.getPopularMovies({ page, limit });

            reply.send({
                results: popular.movies,
                pagination: {
                    page,
                    limit,
                    total: popular.total,
                    totalPages: Math.ceil(popular.total / limit),
                },
            });
        } catch (error) {
            throw Errors.internal("Failed to get popular movies");
        }
    }

    /**
     * Get top rated movies
     * @route GET /api/v1/movies/top-rated
     */
    async getTopRatedMovies(request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) {
        try {
            const { page = 1, limit = 20 } = request.query;

            const topRated = await this.movieService.getTopRatedMovies({ page, limit });

            reply.send({
                results: topRated.movies,
                pagination: {
                    page,
                    limit,
                    total: topRated.total,
                    totalPages: Math.ceil(topRated.total / limit),
                },
            });
        } catch (error) {
            throw Errors.internal("Failed to get top rated movies");
        }
    }

    /**
     * Get upcoming movies
     * @route GET /api/v1/movies/upcoming
     */
    async getUpcomingMovies(request: FastifyRequest<{ Querystring: PaginationQuery }>, reply: FastifyReply) {
        try {
            const { page = 1, limit = 20 } = request.query;

            const upcoming = await this.movieService.getUpcomingMovies({ page, limit });

            reply.send({
                results: upcoming.movies,
                pagination: {
                    page,
                    limit,
                    total: upcoming.total,
                    totalPages: Math.ceil(upcoming.total / limit),
                },
            });
        } catch (error) {
            throw Errors.internal("Failed to get upcoming movies");
        }
    }

    /**
     * Sync movie from TMDB
     * @route POST /api/v1/movies/sync
     */
    async syncMovieFromTMDB(request: FastifyRequest<{ Body: { tmdbId: string } }>, reply: FastifyReply) {
        try {
            const { tmdbId } = request.body;

            const movie = await this.movieService.syncFromTMDB(tmdbId);

            reply.status(201).send({
                message: "Movie synced successfully",
                movie,
            });
        } catch (error) {
            throw Errors.internal("Failed to sync movie from TMDB");
        }
    }
}
