import React from "react";
import { ActorCardProps } from "@/types";
import "@/styles/components/ActorCard.scss";

export const ActorCard: React.FC<ActorCardProps> = ({ actor, onClick, className = "" }) => {
    const handleClick = () => {
        if (onClick) {
            onClick(actor);
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
            className={`actor-card ${className}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={actor.name}
        >
            <div className="actor-card-image">
                {actor.profilePath ? (
                    <img src={actor.profilePath} alt={`${actor.name} profile`} loading="lazy" />
                ) : (
                    <div className="actor-card-placeholder">
                        <span>🎭</span>
                    </div>
                )}
            </div>
            <div className="actor-card-info">
                <h3 className="actor-card-name" title={actor.name}>
                    {actor.name}
                </h3>
                {actor.knownFor && (
                    <p className="actor-card-known-for" title={actor.knownFor}>
                        {actor.knownFor}
                    </p>
                )}
                {actor.birthDate && <p className="actor-card-birth">Born: {new Date(actor.birthDate).getFullYear()}</p>}
            </div>
        </div>
    );
};
