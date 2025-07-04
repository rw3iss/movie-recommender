// Service Worker for PWA functionality
const CACHE_NAME = "movie-rec-v1";
const urlsToCache = ["/", "/index.html", "/manifest.json", "/favicon.ico", "/logo192.png", "/logo512.png"];

// Install event - cache assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("Opened cache");
            return cache.addAll(urlsToCache);
        })
    );
});

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Cache hit - return response
            if (response) {
                return response;
            }

            // Clone the request
            const fetchRequest = event.request.clone();

            return fetch(fetchRequest)
                .then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== "basic") {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                })
                .catch(() => {
                    // Return offline page if available
                    return caches.match("/offline.html");
                });
        })
    );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
    if (event.tag === "sync-ratings") {
        event.waitUntil(syncRatings());
    }
});

async function syncRatings() {
    // Implement sync logic for offline ratings
    console.log("Syncing offline ratings...");
}
