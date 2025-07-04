import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeService } from "@/services/ThemeService";
import { ApiService } from "@/services/ApiService";
import { CacheService } from "@/services/CacheService";
import { UserListService } from "@/services/UserListService";
import { Navigation } from "@/components/Navigation";
import { HomePage } from "@/components/pages/HomePage";
import { MovieDetailsPage } from "@/components/pages/MovieDetailsPage";
import { ActorDetailsPage } from "@/components/pages/ActorDetailsPage";
import { DirectorDetailsPage } from "@/components/pages/DirectorDetailsPage";
import { ListManagementPage } from "@/components/pages/ListManagementPage";
import { ListDetailsPage } from "@/components/pages/ListDetailsPage";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Theme, UserList, AppState } from "@/types";
import "@/styles/App.scss";

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>({
        theme: "light",
        user: {
            favoriteMovies: [],
            favoriteActors: [],
            favoriteDirectors: [],
            lists: [],
            preferences: null,
        },
        loading: {
            search: false,
            recommendations: false,
            details: false,
        },
        error: null,
    });

    const [isInitialized, setIsInitialized] = useState(false);

    // Services
    const themeService = new ThemeService();
    const apiService = new ApiService();
    const cacheService = new CacheService();
    const listService = new UserListService(apiService);

    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        try {
            // Load theme from localStorage
            const savedTheme = themeService.getTheme();
            setTheme(savedTheme);

            // Load user lists
            await loadUserLists();

            // Load user preferences
            await loadUserPreferences();

            setIsInitialized(true);
        } catch (error) {
            console.error("Failed to initialize app:", error);
            setAppState((prev) => ({
                ...prev,
                error: {
                    message: "Failed to initialize application",
                    details: error,
                },
            }));
            setIsInitialized(true);
        }
    };

    const setTheme = (theme: Theme) => {
        themeService.setTheme(theme);
        setAppState((prev) => ({ ...prev, theme }));

        // Apply theme class to body
        document.body.className = theme === "dark" ? "dark-theme" : "light-theme";
    };

    const toggleTheme = () => {
        const newTheme = appState.theme === "light" ? "dark" : "light";
        setTheme(newTheme);
    };

    const loadUserLists = async () => {
        try {
            const lists = await listService.getUserLists();
            setAppState((prev) => ({
                ...prev,
                user: { ...prev.user, lists },
            }));
        } catch (error) {
            console.error("Failed to load user lists:", error);
        }
    };

    const loadUserPreferences = async () => {
        try {
            const preferences = await apiService.get("/api/user/preferences");
            const favoriteMovies = await apiService.get("/api/user/favorite-movies");
            const favoriteActors = await apiService.get("/api/user/favorite-actors");
            const favoriteDirectors = await apiService.get("/api/user/favorite-directors");

            setAppState((prev) => ({
                ...prev,
                user: {
                    ...prev.user,
                    preferences,
                    favoriteMovies,
                    favoriteActors,
                    favoriteDirectors,
                },
            }));
        } catch (error) {
            console.error("Failed to load user preferences:", error);
        }
    };

    const setLoading = (key: keyof AppState["loading"], value: boolean) => {
        setAppState((prev) => ({
            ...prev,
            loading: { ...prev.loading, [key]: value },
        }));
    };

    const setError = (error: AppState["error"]) => {
        setAppState((prev) => ({ ...prev, error }));
    };

    const clearError = () => {
        setAppState((prev) => ({ ...prev, error: null }));
    };

    if (!isInitialized) {
        return (
            <div className="app-loading">
                <LoadingSpinner size="large" />
                <p>Initializing Movie Recommendation Engine...</p>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <Router>
                <div className={`app ${appState.theme}-theme`}>
                    <Navigation
                        lists={appState.user.lists}
                        currentPath={window.location.pathname}
                        theme={appState.theme}
                        onThemeToggle={toggleTheme}
                    />

                    <main className="main-content">
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <HomePage
                                        favoriteMovies={appState.user.favoriteMovies}
                                        favoriteActors={appState.user.favoriteActors}
                                        favoriteDirectors={appState.user.favoriteDirectors}
                                        preferences={appState.user.preferences}
                                        apiService={apiService}
                                        cacheService={cacheService}
                                        setLoading={setLoading}
                                        setError={setError}
                                        loading={appState.loading}
                                    />
                                }
                            />

                            <Route
                                path="/movie/:id"
                                element={
                                    <MovieDetailsPage
                                        apiService={apiService}
                                        cacheService={cacheService}
                                        setLoading={setLoading}
                                        setError={setError}
                                        loading={appState.loading.details}
                                    />
                                }
                            />

                            <Route
                                path="/actor/:id"
                                element={
                                    <ActorDetailsPage
                                        apiService={apiService}
                                        cacheService={cacheService}
                                        setLoading={setLoading}
                                        setError={setError}
                                        loading={appState.loading.details}
                                    />
                                }
                            />

                            <Route
                                path="/director/:id"
                                element={
                                    <DirectorDetailsPage
                                        apiService={apiService}
                                        cacheService={cacheService}
                                        setLoading={setLoading}
                                        setError={setError}
                                        loading={appState.loading.details}
                                    />
                                }
                            />

                            <Route
                                path="/lists"
                                element={
                                    <ListManagementPage
                                        lists={appState.user.lists}
                                        listService={listService}
                                        onListsUpdate={loadUserLists}
                                        setLoading={setLoading}
                                        setError={setError}
                                    />
                                }
                            />

                            <Route
                                path="/list/:id"
                                element={
                                    <ListDetailsPage
                                        listService={listService}
                                        apiService={apiService}
                                        setLoading={setLoading}
                                        setError={setError}
                                        loading={appState.loading.details}
                                    />
                                }
                            />
                        </Routes>
                    </main>

                    {appState.error && (
                        <div className="error-toast">
                            <div className="error-content">
                                <h4>Error</h4>
                                <p>{appState.error.message}</p>
                                <button onClick={clearError} className="error-close">
                                    ×
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Router>
        </ErrorBoundary>
    );
};

export default App;
