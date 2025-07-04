# Movie Recommendation Frontend

## Directory Structure

```
app/
├── src/
│   ├── index.tsx                    # Application entry point
│   ├── App.tsx                      # Main App component with routing
│   ├── components/
│   │   ├── common/
│   │   │   ├── ErrorBoundary.tsx    # Global error boundary
│   │   │   ├── LoadingSpinner.tsx   # Loading indicator
│   │   │   ├── SearchBox.tsx        # Universal search component
│   │   │   └── ThemeToggle.tsx      # Theme switcher
│   │   ├── cards/
│   │   │   ├── MovieCard.tsx        # Movie display card
│   │   │   ├── ActorCard.tsx        # Actor display card
│   │   │   └── DirectorCard.tsx     # Director display card
│   │   ├── layout/
│   │   │   ├── Navigation.tsx       # Left sidebar navigation
│   │   │   ├── Header.tsx           # App header
│   │   │   └── ApplicationShell.tsx # Main layout wrapper
│   │   ├── pages/
│   │   │   ├── HomePage.tsx         # Home page with favorites grid
│   │   │   ├── MovieDetailsPage.tsx # Movie details view
│   │   │   ├── ActorDetailsPage.tsx # Actor details view
│   │   │   ├── DirectorDetailsPage.tsx # Director details view
│   │   │   ├── SearchPage.tsx       # Full search results page
│   │   │   ├── ListManagementPage.tsx # Lists overview
│   │   │   ├── ListDetailsPage.tsx  # Individual list view
│   │   │   └── RecommendationsPage.tsx # Movie recommendations
│   │   └── search/
│   │       ├── SearchDropdown.tsx   # Search results dropdown
│   │       ├── SearchFilters.tsx    # Advanced search filters
│   │       └── SearchResult.tsx     # Individual search result
│   ├── services/
│   │   ├── ApiService.ts            # HTTP client for backend
│   │   ├── CacheService.ts          # IndexedDB cache implementation
│   │   ├── ThemeService.ts          # Theme management
│   │   ├── UserListService.ts       # List operations
│   │   └── SearchService.ts         # Search functionality
│   ├── hooks/
│   │   ├── useDebounce.ts           # Debounce hook for search
│   │   ├── useInfiniteScroll.ts    # Infinite scroll hook
│   │   ├── useLocalStorage.ts      # Local storage hook
│   │   └── useCache.ts              # Cache management hook
│   ├── styles/
│   │   ├── App.scss                 # Main app styles
│   │   ├── themes/
│   │   │   ├── _light.scss          # Light theme variables
│   │   │   └── _dark.scss           # Dark theme variables
│   │   ├── components/              # Component-specific styles
│   │   └── utils/                   # Utility styles
│   ├── types/
│   │   └── index.ts                 # TypeScript type definitions
│   └── utils/
│       ├── slugify.ts               # URL slug generation
│       ├── formatters.ts            # Data formatters
│       └── validators.ts            # Input validators
├── public/
│   ├── index.html                   # HTML template
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service worker
│   └── assets/                      # Static assets
├── scripts/
│   ├── build.ts                     # Production build script
│   ├── dev.ts                       # Development server
│   └── preview.ts                   # Preview build
├── package.json
├── tsconfig.json
└── README.md                        # This file
```

## Overview

The Movie Recommendation Frontend is a React 19 Progressive Web Application (PWA) that provides an intuitive interface for discovering and managing movies. Built with TypeScript and following SOLID principles.

### Key Features

1. **Progressive Web App**
   - Offline support with service workers
   - Installable on desktop and mobile
   - App-like experience

2. **Advanced Caching**
   - IndexedDB for API response caching
   - Smart cache key generation from request parameters
   - Configurable TTL for different data types
   - Automatic cache cleanup

3. **Theme Support**
   - Light and dark mode with Material UI
   - Theme preference saved in localStorage
   - Smooth theme transitions
   - System theme detection

4. **Universal Search**
   - Real-time search with 250ms throttling
   - Search across movies, actors, and directors
   - Advanced filters with expandable UI
   - Keyboard navigation support

5. **Smart Routing**
   - SEO-friendly URLs with slugs
   - Support for both slugs and IDs
   - Deep linking support
   - Browser history management

### Advanced Architecture Features

1. **Service Layer Pattern**
   - All API calls abstracted in services
   - Consistent error handling
   - Type-safe responses with TypeScript

2. **Cache-First Strategy**
   - Check IndexedDB cache before API calls
   - Deterministic cache key generation
   - Background cache updates
   - Cache statistics and management

3. **Component Architecture**
   - Functional components with React Hooks
   - Lazy loading for route components
   - Error boundaries for graceful failures
   - Suspense for loading states

4. **State Management**
   - Centralized app state in App.tsx
   - Context API for global state
   - Local component state where appropriate
   - Optimistic UI updates

5. **Performance Optimizations**
   - Code splitting by route
   - Image lazy loading
   - Virtual scrolling for long lists
   - Memoization of expensive computations

## Key Components

### ApplicationShell
- Wraps entire application
- Provides consistent layout
- Manages navigation state
- Handles global loading/error states

### SearchBox
- Universal search with debouncing
- Type-ahead suggestions
- Filter toggle for advanced search
- Keyboard shortcuts (Cmd/Ctrl + K)

### Navigation
- Responsive sidebar
- Dynamic user lists
- Active route highlighting
- Collapsible on mobile

### HomePage
- 4x4 grid layouts for favorites
- Quick access to recommendations
- Recent activity feed
- Search prominence

## Routing Structure

```
/ - Home page with favorites grid
/movies/:slug - Movie details (e.g., /movies/gladiator-2000)
/movies?imdb_id=tt0172495 - Movie by IMDB ID
/actors/:slug - Actor details (e.g., /actors/russell-crowe)
/actors?tmdb_id=934 - Actor by TMDB ID
/directors/:slug - Director details
/directors?tmdb_id=1704 - Director by TMDB ID
/search?q=inception&type=movie - Search results
/lists - List management
/lists/:id - List details
/recommendations - Personalized recommendations
```

## Cache Implementation

The CacheService uses IndexedDB with the following strategy:

```typescript
// Cache key generation
const key = generateKey(endpoint, params);
// Example: "GET:/api/movies/search?genre=action&year=2020"

// Cache check
const cached = await cacheService.get(key);
if (cached && !isExpired(cached)) {
  return cached.data;
}

// API call and cache update
const data = await apiService.get(endpoint, params);
await cacheService.set(key, data, ttl);
```

## Theme System

Themes are implemented using SCSS variables and CSS classes:

```scss
// Light theme
.light-theme {
  --color-primary: #3b82f6;
  --color-background: #ffffff;
  --color-text: #111827;
}

// Dark theme
.dark-theme {
  --color-primary: #60a5fa;
  --color-background: #111827;
  --color-text: #f9fafb;
}
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Available at http://localhost:3000

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check
```

## Environment Variables

Create a `.env` file:
```
API_URL=http://localhost:3001
```

## Building and Bundling

The app uses esbuild for fast builds:
- SCSS compilation with sass
- TypeScript transpilation
- Code splitting
- Asset optimization
- Source maps in development

## PWA Features

- Service worker for offline support
- App manifest for installation
- Push notification support (future)
- Background sync (future)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Documentation Generation

```bash
# Generate documentation
npm run docs

# Documentation will be available in docs/ directory
```