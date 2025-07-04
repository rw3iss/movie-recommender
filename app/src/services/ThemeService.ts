import { Theme } from "@/types";

/**
 * Theme Service following Single Responsibility Principle
 * Handles theme persistence and management
 */
export class ThemeService {
    private storageKey: string = "movie-app-theme";
    private defaultTheme: Theme = "light";

    /**
     * Get the current theme from localStorage or return default
     */
    getTheme(): Theme {
        try {
            const storedTheme = localStorage.getItem(this.storageKey);

            if (storedTheme === "light" || storedTheme === "dark") {
                return storedTheme;
            }

            // Check system preference if no stored theme
            return this.getSystemTheme();
        } catch (error) {
            console.warn("Failed to get theme from localStorage:", error);
            return this.defaultTheme;
        }
    }

    /**
     * Set and persist the theme
     */
    setTheme(theme: Theme): void {
        try {
            localStorage.setItem(this.storageKey, theme);
            this.applyTheme(theme);
        } catch (error) {
            console.warn("Failed to save theme to localStorage:", error);
            // Still apply the theme even if we can't save it
            this.applyTheme(theme);
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme(): Theme {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === "light" ? "dark" : "light";
        this.setTheme(newTheme);
        return newTheme;
    }

    /**
     * Get the system's preferred theme
     */
    private getSystemTheme(): Theme {
        if (typeof window !== "undefined" && window.matchMedia) {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            return prefersDark ? "dark" : "light";
        }
        return this.defaultTheme;
    }

    /**
     * Apply theme to the document
     */
    private applyTheme(theme: Theme): void {
        if (typeof document !== "undefined") {
            // Remove existing theme classes
            document.body.classList.remove("light-theme", "dark-theme");

            // Add new theme class
            document.body.classList.add(`${theme}-theme`);

            // Update meta theme-color for mobile browsers
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute("content", theme === "dark" ? "#1a202c" : "#ffffff");
            }
        }
    }

    /**
     * Listen for system theme changes
     */
    watchSystemTheme(callback: (theme: Theme) => void): () => void {
        if (typeof window !== "undefined" && window.matchMedia) {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

            const handler = (e: MediaQueryListEvent) => {
                // Only update if user hasn't manually set a preference
                const storedTheme = localStorage.getItem(this.storageKey);
                if (!storedTheme) {
                    const systemTheme = e.matches ? "dark" : "light";
                    callback(systemTheme);
                }
            };

            mediaQuery.addEventListener("change", handler);

            // Return cleanup function
            return () => {
                mediaQuery.removeEventListener("change", handler);
            };
        }

        // Return no-op cleanup function if matchMedia not available
        return () => {};
    }

    /**
     * Reset theme to system preference
     */
    resetToSystemTheme(): Theme {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.warn("Failed to remove theme from localStorage:", error);
        }

        const systemTheme = this.getSystemTheme();
        this.applyTheme(systemTheme);
        return systemTheme;
    }

    /**
     * Get available themes
     */
    getAvailableThemes(): Theme[] {
        return ["light", "dark"];
    }

    /**
     * Get theme configuration for CSS custom properties
     */
    getThemeConfig(theme: Theme): Record<string, string> {
        const configs = {
            light: {
                "--color-primary": "#3b82f6",
                "--color-secondary": "#6b7280",
                "--color-background": "#ffffff",
                "--color-surface": "#f9fafb",
                "--color-text": "#111827",
                "--color-text-secondary": "#6b7280",
                "--color-border": "#e5e7eb",
                "--color-hover": "#f3f4f6",
                "--color-accent": "#fbbf24",
                "--color-success": "#10b981",
                "--color-warning": "#f59e0b",
                "--color-error": "#ef4444",
            },
            dark: {
                "--color-primary": "#60a5fa",
                "--color-secondary": "#9ca3af",
                "--color-background": "#111827",
                "--color-surface": "#1f2937",
                "--color-text": "#f9fafb",
                "--color-text-secondary": "#d1d5db",
                "--color-border": "#374151",
                "--color-hover": "#374151",
                "--color-accent": "#fbbf24",
                "--color-success": "#34d399",
                "--color-warning": "#fbbf24",
                "--color-error": "#f87171",
            },
        };

        return configs[theme];
    }

    /**
     * Apply theme CSS custom properties
     */
    applyThemeProperties(theme: Theme): void {
        if (typeof document !== "undefined") {
            const config = this.getThemeConfig(theme);
            const root = document.documentElement;

            Object.entries(config).forEach(([property, value]) => {
                root.style.setProperty(property, value);
            });
        }
    }
}
