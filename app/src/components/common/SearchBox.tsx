import React, { useState, useEffect, useRef } from "react";
import { ApiServiceInterface, CacheServiceInterface, SearchResult, AppState } from "@/types";
import { SearchDropdown } from "@/components/search/SearchDropdown";
import { SearchFilters } from "@/components/search/SearchFilters";
import { useDebounce } from "@/hooks/useDebounce";
import "@/styles/components/SearchBox.scss";

interface SearchBoxProps {
    apiService: ApiServiceInterface;
    cacheService: CacheServiceInterface;
    onSelect: (type: "movie" | "actor" | "director", item: any) => void;
    setLoading: (key: keyof AppState["loading"], value: boolean) => void;
    setError: (error: AppState["error"]) => void;
    placeholder?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
    apiService,
    cacheService,
    onSelect,
    setLoading,
    setError,
    placeholder = "Search...",
}) => {
    const [query, setQuery] = useState("");
    const [searchType, setSearchType] = useState<"all" | "movie" | "actor" | "director">("all");
    const [showFilters, setShowFilters] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult>({
        movies: [],
        actors: [],
        directors: [],
    });
    const [filters, setFilters] = useState({});

    const searchRef = useRef<HTMLDivElement>(null);
    const debouncedQuery = useDebounce(query, 250);

    useEffect(() => {
        if (debouncedQuery) {
            performSearch();
        } else {
            setSearchResults({ movies: [], actors: [], directors: [] });
            setShowDropdown(false);
        }
    }, [debouncedQuery, searchType, filters]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const performSearch = async () => {
        try {
            setLoading("search", true);

            // Try cache first
            const cacheKey = `search:${searchType}:${debouncedQuery}:${JSON.stringify(filters)}`;
            const cached = await cacheService.get<SearchResult>(cacheKey);

            if (cached) {
                setSearchResults(cached);
                setShowDropdown(true);
                return;
            }

            // API call
            const response = await apiService.searchGlobal(debouncedQuery, searchType);
            setSearchResults(response);
            setShowDropdown(true);

            // Cache the results
            await cacheService.set(cacheKey, response, 300); // 5 minutes
        } catch (error) {
            console.error("Search failed:", error);
            setError({
                message: "Search failed. Please try again.",
                details: error,
            });
        } finally {
            setLoading("search", false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            window.location.href = `/search?q=${encodeURIComponent(query)}&type=${searchType}`;
        }
    };

    const handleItemClick = (type: "movie" | "actor" | "director", item: any) => {
        setShowDropdown(false);
        setQuery("");
        onSelect(type, item);
    };

    return (
        <div className="search-box" ref={searchRef}>
            <div className="search-type-selector">
                <label className={`type-radio ${searchType === "all" ? "active" : ""}`}>
                    <input
                        type="radio"
                        name="searchType"
                        value="all"
                        checked={searchType === "all"}
                        onChange={(e) => setSearchType(e.target.value as any)}
                    />
                    <span>All</span>
                </label>
                <label className={`type-radio ${searchType === "movie" ? "active" : ""}`}>
                    <input
                        type="radio"
                        name="searchType"
                        value="movie"
                        checked={searchType === "movie"}
                        onChange={(e) => setSearchType(e.target.value as any)}
                    />
                    <span>Movies</span>
                </label>
                <label className={`type-radio ${searchType === "actor" ? "active" : ""}`}>
                    <input
                        type="radio"
                        name="searchType"
                        value="actor"
                        checked={searchType === "actor"}
                        onChange={(e) => setSearchType(e.target.value as any)}
                    />
                    <span>Actors</span>
                </label>
                <label className={`type-radio ${searchType === "director" ? "active" : ""}`}>
                    <input
                        type="radio"
                        name="searchType"
                        value="director"
                        checked={searchType === "director"}
                        onChange={(e) => setSearchType(e.target.value as any)}
                    />
                    <span>Directors</span>
                </label>
            </div>

            <div className="search-input-container">
                <input
                    type="text"
                    className="search-input"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query && setShowDropdown(true)}
                />
                <button
                    className="advanced-button"
                    onClick={() => setShowFilters(!showFilters)}
                    aria-label="Toggle advanced filters"
                >
                    Advanced
                </button>
            </div>

            {showFilters && <SearchFilters searchType={searchType} filters={filters} onFiltersChange={setFilters} />}

            <SearchDropdown results={searchResults} isVisible={showDropdown} onItemClick={handleItemClick} />
        </div>
    );
};
