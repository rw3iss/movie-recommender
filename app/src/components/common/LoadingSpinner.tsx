import React from "react";
import "@/styles/components/LoadingSpinner.scss";

interface LoadingSpinnerProps {
    size?: "small" | "medium" | "large";
    className?: string;
    message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "medium", className = "", message }) => {
    return (
        <div className={`loading-spinner-container ${className}`}>
            <div className={`loading-spinner ${size}`}>
                <div className="spinner-circle"></div>
                <div className="spinner-circle"></div>
                <div className="spinner-circle"></div>
                <div className="spinner-circle"></div>
            </div>
            {message && <p className="loading-message">{message}</p>}
        </div>
    );
};
