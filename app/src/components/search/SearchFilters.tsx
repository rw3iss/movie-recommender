import React from "react";
import "@/styles/components/SearchFilters.scss";

interface SearchFiltersProps {
    searchType: "all" | "movie" | "actor" | "director";
    filters: any;
    onFiltersChange: (filters: any) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({ searchType, filters, onFiltersChange }) => {
    const handleFilterChange = (key: string, value: any) => {
        onFiltersChange({
            ...filters,
            [key]: value,
        });
    };

    const showMovieFilters = searchType === "all" || searchType === "movie";
    const showPersonFilters = searchType === "all" || searchType === "actor" || searchType === "director";

    return (
        <div className="search-filters">
            {showMovieFilters && (
                <div className="filter-section">
                    <h4>Movie Filters</h4>
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Year From</label>
                            <input
                                type="number"
                                placeholder="1900"
                                value={filters.yearFrom || ""}
                                onChange={(e) => handleFilterChange("yearFrom", e.target.value)}
                                min="1900"
                                max={new Date().getFullYear()}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Year To</label>
                            <input
                                type="number"
                                placeholder={new Date().getFullYear().toString()}
                                value={filters.yearTo || ""}
                                onChange={(e) => handleFilterChange("yearTo", e.target.value)}
                                min="1900"
                                max={new Date().getFullYear()}
                            />
                        </div>
                    </div>
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Genre</label>
                            <select
                                value={filters.genre || ""}
                                onChange={(e) => handleFilterChange("genre", e.target.value)}
                            >
                                <option value="">All Genres</option>
                                <option value="action">Action</option>
                                <option value="adventure">Adventure</option>
                                <option value="comedy">Comedy</option>
                                <option value="drama">Drama</option>
                                <option value="horror">Horror</option>
                                <option value="sci-fi">Sci-Fi</option>
                                <option value="thriller">Thriller</option>
                                <option value="romance">Romance</option>
                                <option value="documentary">Documentary</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Min Rating</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={filters.minRating || ""}
                                onChange={(e) => handleFilterChange("minRating", e.target.value)}
                                min="0"
                                max="10"
                                step="0.1"
                            />
                        </div>
                    </div>
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Min Votes</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={filters.minVotes || ""}
                                onChange={(e) => handleFilterChange("minVotes", e.target.value)}
                                min="0"
                            />
                        </div>
                    </div>
                </div>
            )}

            {showPersonFilters && (
                <div className="filter-section">
                    <h4>Person Filters</h4>
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Birth Year From</label>
                            <input
                                type="number"
                                placeholder="1850"
                                value={filters.birthYearFrom || ""}
                                onChange={(e) => handleFilterChange("birthYearFrom", e.target.value)}
                                min="1850"
                                max={new Date().getFullYear()}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Birth Year To</label>
                            <input
                                type="number"
                                placeholder={new Date().getFullYear().toString()}
                                value={filters.birthYearTo || ""}
                                onChange={(e) => handleFilterChange("birthYearTo", e.target.value)}
                                min="1850"
                                max={new Date().getFullYear()}
                            />
                        </div>
                    </div>
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Nationality</label>
                            <input
                                type="text"
                                placeholder="e.g., American"
                                value={filters.nationality || ""}
                                onChange={(e) => handleFilterChange("nationality", e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Min Movie Count</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={filters.minMovieCount || ""}
                                onChange={(e) => handleFilterChange("minMovieCount", e.target.value)}
                                min="0"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="filter-actions">
                <button className="clear-filters" onClick={() => onFiltersChange({})}>
                    Clear Filters
                </button>
            </div>
        </div>
    );
};
