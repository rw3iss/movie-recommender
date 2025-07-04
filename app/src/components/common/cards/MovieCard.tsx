import React from "react";
import { MovieCardProps } from "@/types";
import "@/styles/components/MovieCard.scss";

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick, showRating = false, className = "" }) => {
    const handleClick = () => {
        if (onClick) {
            onClick(movie);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <div
            className={`movie-card ${className}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`${movie.title} ${movie.year ? `(${movie.year})` : ""}`}
        >
            <div className="movie-card-poster">
                {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt={`${movie.title} poster`} loading="lazy" />
                ) : (
                    <div className="movie-card-placeholder">
                        <span>🎬</span>
                    </div>
                )}
                {showRating && movie.imdbRating && (
                    <div className="movie-card-rating">
                        <span className="rating-star">⭐</span>
                        <span className="rating-value">{movie.imdbRating.toFixed(1)}</span>
                    </div>
                )}
            </div>
            <div className="movie-card-info">
                <h3 className="movie-card-title" title={movie.title}>
                    {movie.title}
                </h3>
                {movie.year && <p className="movie-card-year">{movie.year}</p>}
                {movie.director && (
                    <p className="movie-card-director" title={movie.director}>
                        Dir: {movie.director}
                    </p>
                )}
            </div>
        </div>
    );
};
