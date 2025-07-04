import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Check if root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Failed to find the root element");
}

// Create root
const root = ReactDOM.createRoot(rootElement);

// Render app
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
