import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { NavigationProps, Theme } from "@/types";
import "@/styles/components/Navigation.scss";

export const Navigation: React.FC<NavigationProps & { theme: Theme; onThemeToggle: () => void }> = ({
    lists,
    currentPath,
    theme,
    onThemeToggle,
    className,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const location = useLocation();

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    const navItems = [
        { path: "/", label: "Home", icon: "🏠" },
        { path: "/movies", label: "Movies", icon: "🎬" },
        { path: "/actors", label: "Actors", icon: "🎭" },
        { path: "/directors", label: "Directors", icon: "🎨" },
        { path: "/recommendations", label: "Recommend a Movie", icon: "✨" },
        { path: "/lists", label: "Manage Lists", icon: "📋" },
    ];

    return (
        <nav className={`navigation ${isCollapsed ? "collapsed" : ""} ${className || ""}`}>
            <div className="navigation-header">
                <h1 className="navigation-title">{!isCollapsed && "Movie Rec"}</h1>
                <button
                    className="navigation-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    aria-label="Toggle navigation"
                >
                    {isCollapsed ? "→" : "←"}
                </button>
            </div>

            <div className="navigation-main">
                <ul className="navigation-items">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <Link
                                to={item.path}
                                className={`navigation-link ${isActive(item.path) ? "active" : ""}`}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <span className="navigation-icon">{item.icon}</span>
                                {!isCollapsed && <span className="navigation-label">{item.label}</span>}
                            </Link>
                        </li>
                    ))}
                </ul>

                {lists.length > 0 && (
                    <div className="navigation-lists">
                        <h3 className="navigation-section-title">{!isCollapsed ? "Your Lists" : ""}</h3>
                        <ul className="navigation-items">
                            {lists.slice(0, 5).map((list) => (
                                <li key={list.id}>
                                    <Link
                                        to={`/list/${list.id}`}
                                        className={`navigation-link ${isActive(`/list/${list.id}`) ? "active" : ""}`}
                                        title={isCollapsed ? list.name : undefined}
                                    >
                                        <span className="navigation-icon">📄</span>
                                        {!isCollapsed && (
                                            <span className="navigation-label">
                                                {list.name}
                                                {list.itemCount && (
                                                    <span className="navigation-count">({list.itemCount})</span>
                                                )}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                            {lists.length > 5 && !isCollapsed && (
                                <li>
                                    <Link to="/lists" className="navigation-link navigation-more">
                                        View all lists →
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>

            <div className="navigation-footer">
                <button
                    className="theme-toggle"
                    onClick={onThemeToggle}
                    title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                >
                    {theme === "light" ? "🌙" : "☀️"}
                    {!isCollapsed && <span>Toggle Theme</span>}
                </button>
            </div>
        </nav>
    );
};
