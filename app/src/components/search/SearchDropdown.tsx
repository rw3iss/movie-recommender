import React from "react";
import { SearchDropdownProps } from "@/types";
import "@/styles/components/SearchDropdown.scss";

export const SearchDropdown: React.FC<SearchDropdownProps> = ({ results, isVisible, onItemClick }) => {
    if (!isVisible) return null;

    const hasResults = results.movies.length > 0 || results.actors.length > 0 || results.directors.length > 0;

    if (!hasResults) {
        return (
            <div className="search-dropdown empty">
                <p>No results found</p>
            </div>
        );
    }

    return (
        <div className="search-dropdown">
            {results.movies.length > 0 && (
                <div className="search-section">
                    <h4>Movies</h4>
                    <ul>
                        {results.movies.slice(0, 5).map((movie) => (
                            <li key={movie.imdbId} onClick={() => onItemClick("movie", movie)} className="search-item">
                                <div className="search-item-content">
                                    <strong>{movie.title}</strong>
                                    {movie.year && <span className="year"> ({movie.year})</span>}
                                    {movie.director && <span className="director"> - {movie.director}</span>}
                                    {movie.imdbRating && <span className="rating"> ({movie.imdbRating})</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {results.actors.length > 0 && (
                <div className="search-section">
                    <h4>Actors</h4>
                    <ul>
                        {results.actors.slice(0, 5).map((actor) => (
                            <li key={actor.id} onClick={() => onItemClick("actor", actor)} className="search-item">
                                <div className="search-item-content">
                                    <strong>{actor.name}</strong>
                                    {actor.knownFor && <span className="known-for"> - {actor.knownFor}</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {results.directors.length > 0 && (
                <div className="search-section">
                    <h4>Directors</h4>
                    <ul>
                        {results.directors.slice(0, 5).map((director) => (
                            <li
                                key={director.id}
                                onClick={() => onItemClick("director", director)}
                                className="search-item"
                            >
                                <div className="search-item-content">
                                    <strong>{director.name}</strong>
                                    {director.knownFor && <span className="known-for"> - {director.knownFor}</span>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
