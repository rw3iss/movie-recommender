import React from "react";
import { DirectorCardProps } from "@/types";
import "@/styles/components/DirectorCard.scss";

export const DirectorCard: React.FC<DirectorCardProps> = ({ director, onClick, className = "" }) => {
    const handleClick = () => {
        if (onClick) {
            onClick(director);
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
            className={`director-card ${className}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={director.name}
        >
            <div className="director-card-image">
                {director.profilePath ? (
                    <img src={director.profilePath} alt={`${director.name} profile`} loading="lazy" />
                ) : (
                    <div className="director-card-placeholder">
                        <span>🎨</span>
                    </div>
                )}
            </div>
            <div className="director-card-info">
                <h3 className="director-card-name" title={director.name}>
                    {director.name}
                </h3>
                {director.knownFor && (
                    <p className="director-card-known-for" title={director.knownFor}>
                        {director.knownFor}
                    </p>
                )}
                {director.birthDate && (
                    <p className="director-card-birth">Born: {new Date(director.birthDate).getFullYear()}</p>
                )}
            </div>
        </div>
    );
};
