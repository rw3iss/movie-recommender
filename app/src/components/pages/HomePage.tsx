import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Movie, Actor, Director, ApiServiceInterface, CacheServiceInterface, UserPreferences, AppState } from "@/types";
import { SearchBox } from "@/components/common/SearchBox";
import { MovieCard } from "@/components/cards/MovieCard";
import { ActorCard } from "@/components/cards/ActorCard";
import { DirectorCard } from "@/components/cards/DirectorCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import "@/styles/pages/HomePage.scss";

interface HomePageProps {
    favoriteMovies: Movie[];
    favoriteActors: Actor[];
    favoriteDirectors: Director[];
    preferences: UserPreferences | null;
    apiService: ApiServiceInterface;
    cacheService: CacheServiceInterface;
    setLoading: (key: keyof AppState["loading"], value: boolean) => void;
    setError: (error: AppState["error"]) => void;
    loading: AppState["loading"];
}

export const HomePage: React.FC<HomePageProps> = ({
    favoriteMovies,
    favoriteActors,
    favoriteDirectors,
    preferences,
    apiService,
    cacheService,
    setLoading,
    setError,
    loading,
}) => {
    const navigate = useNavigate();
    const [recommendations, setRecommendations] = useState<Movie[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        loadRecommendations();
        loadRecentActivity();
    }, []);

    const loadRecommendations = async () => {
        try {
            setLoading("recommendations", true);
            const data = await apiService.getRecommendations();
            setRecommendations(data.results || []);
        } catch (error) {
            console.error("Failed to load recommendations:", error);
        } finally {
            setLoading("recommendations", false);
        }
    };

    const loadRecentActivity = async () => {
        try {
            const data = await apiService.get("/api/user/activity");
            setRecentActivity(data.activities || []);
        } catch (error) {
            console.error("Failed to load recent activity:", error);
        }
    };

    const handleMovieClick = (movie: Movie) => {
        navigate(`/movie/${movie.imdbId}`);
    };

    const handleActorClick = (actor: Actor) => {
        navigate(`/actor/${actor.id}`);
    };

    const handleDirectorClick = (director: Director) => {
        navigate(`/director/${director.id}`);
    };

    const handleSearchSelect = (type: string, item: any) => {
        navigate(`/${type}/${item.id || item.imdbId}`);
    };

    return (
        <div className="home-page">
            <div className="home-header">
                <h1>Discover Your Next Favorite Movie</h1>
                <div className="search-container">
                    <SearchBox
                        apiService={apiService}
                        cacheService={cacheService}
                        onSelect={handleSearchSelect}
                        setLoading={setLoading}
                        setError={setError}
                        placeholder="Search for movies, actors, or directors..."
                    />
                </div>
            </div>

            {preferences && (
                <div className="home-stats">
                    <div className="stat-card">
                        <span className="stat-value">{preferences.totalRatings}</span>
                        <span className="stat-label">Movies Rated</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{preferences.averageRating.toFixed(1)}</span>
                        <span className="stat-label">Average Rating</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{preferences.favoriteGenres[0]?.genre || "N/A"}</span>
                        <span className="stat-label">Favorite Genre</span>
                    </div>
                </div>
            )}

            {loading.recommendations && (
                <div className="loading-section">
                    <LoadingSpinner />
                    <p>Loading recommendations...</p>
                </div>
            )}

            {recommendations.length > 0 && (
                <section className="home-section">
                    <h2>Recommended for You</h2>
                    <div className="recommendations-grid">
                        {recommendations.slice(0, 8).map((movie) => (
                            <MovieCard key={movie.imdbId} movie={movie} onClick={handleMovieClick} showRating />
                        ))}
                    </div>
                    <button className="view-all-button" onClick={() => navigate("/recommendations")}>
                        View All Recommendations →
                    </button>
                </section>
            )}

            {favoriteMovies.length > 0 && (
                <section className="home-section">
                    <h2>Your Favorite Movies</h2>
                    <div className="grid-4x4">
                        {favoriteMovies.slice(0, 16).map((movie) => (
                            <MovieCard key={movie.imdbId} movie={movie} onClick={handleMovieClick} showRating />
                        ))}
                    </div>
                </section>
            )}

            {favoriteActors.length > 0 && (
                <section className="home-section">
                    <h2>Your Favorite Actors</h2>
                    <div className="grid-4x4">
                        {favoriteActors.slice(0, 16).map((actor) => (
                            <ActorCard key={actor.id} actor={actor} onClick={handleActorClick} />
                        ))}
                    </div>
                </section>
            )}

            {favoriteDirectors.length > 0 && (
                <section className="home-section">
                    <h2>Your Favorite Directors</h2>
                    <div className="grid-4x4">
                        {favoriteDirectors.slice(0, 16).map((director) => (
                            <DirectorCard key={director.id} director={director} onClick={handleDirectorClick} />
                        ))}
                    </div>
                </section>
            )}

            {recentActivity.length > 0 && (
                <section className="home-section recent-activity">
                    <h2>Recent Activity</h2>
                    <div className="activity-list">
                        {recentActivity.map((activity, index) => (
                            <div key={index} className="activity-item">
                                <span className="activity-icon">{activity.icon}</span>
                                <div className="activity-content">
                                    <p>{activity.description}</p>
                                    <span className="activity-time">{activity.timeAgo}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
