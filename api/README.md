# Movie Recommendation API

## Directory Structure

```
api/
├── src/
│   ├── server.ts                    # Main server entry point with Fastify configuration
│   ├── config/
│   │   └── index.ts                 # Environment configuration
│   ├── controllers/
│   │   ├── ActorController.ts       # Actor endpoints controller
│   │   ├── AuthController.ts        # Authentication controller
│   │   ├── DirectorController.ts    # Director endpoints controller
│   │   ├── ListController.ts        # User lists controller
│   │   ├── MovieController.ts       # Movie endpoints controller
│   │   ├── SearchController.ts      # Universal search controller
│   │   └── UserController.ts        # User profile/preferences controller
│   ├── engine/
│   │   ├── RecommendationEngine.ts  # Main recommendation engine
│   │   ├── interfaces/
│   │   │   └── IRecommendationStrategy.ts
│   │   └── strategies/
│   │       ├── ContentBasedStrategy.ts
│   │       ├── CollaborativeFilteringStrategy.ts
│   │       └── MLRecommendationStrategy.ts
│   ├── middleware/
│   │   ├── auth.ts                  # JWT authentication middleware
│   │   ├── errorHandler.ts          # Global error handler
│   │   └── validation.ts            # Request validation middleware
│   ├── plugins/
│   │   ├── auth.ts                  # Auth plugin setup
│   │   ├── cache.ts                 # Redis cache plugin
│   │   └── metrics.ts               # Metrics collection plugin
│   ├── routes/
│   │   ├── actorRoutes.ts           # /api/v1/actors endpoints
│   │   ├── authRoutes.ts            # /api/v1/auth endpoints
│   │   ├── directorRoutes.ts        # /api/v1/directors endpoints
│   │   ├── healthRoutes.ts          # /api/v1/health endpoints
│   │   ├── listRoutes.ts            # /api/v1/lists endpoints
│   │   ├── movieRoutes.ts           # /api/v1/movies endpoints
│   │   ├── searchRoutes.ts          # /api/v1/search endpoints
│   │   └── userRoutes.ts            # /api/v1/users endpoints
│   ├── services/
│   │   ├── ActorService.ts          # Actor business logic
│   │   ├── AuthService.ts           # Authentication service
│   │   ├── CacheService.ts          # Cache management
│   │   ├── DatabaseService.ts       # Database operations
│   │   ├── DirectorService.ts       # Director business logic
│   │   ├── EmailService.ts          # Email notifications
│   │   ├── ListService.ts           # List management
│   │   ├── MovieService.ts          # Movie business logic
│   │   ├── RecommendationService.ts # Recommendation orchestration
│   │   ├── SearchService.ts         # Search functionality
│   │   ├── TMDBService.ts           # TMDB API integration
│   │   └── UserPreferenceService.ts # User preferences/ratings
│   ├── types/
│   │   ├── index.ts                 # Common types
│   │   ├── actor.types.ts           # Actor-specific types
│   │   ├── auth.types.ts            # Auth types
│   │   ├── director.types.ts        # Director types
│   │   ├── list.types.ts            # List types
│   │   ├── movie.types.ts           # Movie types
│   │   ├── search.types.ts          # Search types
│   │   └── user.types.ts            # User types
│   └── utils/
│       ├── crypto.ts                # Encryption utilities
│       ├── requestLogger.ts         # Request logging
│       └── validators.ts            # Common validators
├── migrations/                      # Database migrations
├── scripts/
│   └── import-data.ts              # Data import scripts
├── tests/                          # Test files
├── package.json
├── tsconfig.json
├── .env.example
└── README.md                       # This file
```

## Overview

The Movie Recommendation API is a Fastify-based backend service that provides comprehensive movie recommendation functionality. It follows SOLID principles and implements a clean architecture pattern.

### Key Features

1. **Movie Recommendations**
   - Multiple recommendation strategies (Content-based, Collaborative Filtering, ML-based)
   - Pluggable architecture using Strategy Pattern
   - Personalized recommendations based on user ratings and preferences

2. **Data Sources**
   - Local PostgreSQL database for user data and cached movie information
   - TMDB API integration for comprehensive movie, actor, and director data
   - Redis caching for improved performance

3. **Authentication & Authorization**
   - JWT-based authentication
   - Secure password hashing with bcrypt
   - Email verification system
   - OAuth2 integration support

4. **Advanced Search**
   - Universal search across movies, actors, and directors
   - Advanced filters (year, genre, rating, etc.)
   - Quick search for autocomplete
   - Search result caching

5. **User Features**
   - Custom lists management
   - Movie ratings and reviews
   - Import ratings from external services (IMDB, Letterboxd)
   - User preferences and statistics

### Advanced Architecture Features

1. **Service Layer Pattern**
   - Each service handles a single responsibility
   - Services are injected into controllers via dependency injection
   - Clear separation between business logic and HTTP layer

2. **Repository Pattern**
   - DatabaseService abstracts all database operations
   - Easy to swap database implementations
   - Type-safe database queries

3. **Strategy Pattern for Recommendations**
   - IRecommendationStrategy interface for all algorithms
   - Easy to add new recommendation algorithms
   - Runtime strategy switching

4. **Caching Strategy**
   - Multi-level caching (Redis + in-memory)
   - Cache-aside pattern implementation
   - Automatic cache invalidation

5. **Error Handling**
   - Global error handler middleware
   - Custom error types with proper HTTP status codes
   - Detailed error logging

## API Endpoints

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `POST /auth/verify-email` - Verify email address
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### Movies
- `GET /movies/search` - Search movies with filters
- `GET /movies/:id` - Get movie details
- `GET /movies/:id/similar` - Get similar movies
- `GET /movies/recommendations` - Get personalized recommendations
- `POST /movies/:id/rate` - Rate a movie
- `GET /movies/popular` - Get popular movies
- `GET /movies/top-rated` - Get top rated movies
- `GET /movies/upcoming` - Get upcoming movies

### Actors
- `GET /actors/search` - Search actors
- `GET /actors/:id` - Get actor details
- `GET /actors/:id/movies` - Get actor's filmography
- `GET /actors/:id/similar` - Get similar actors
- `GET /actors/popular` - Get popular actors

### Directors
- `GET /directors/search` - Search directors
- `GET /directors/:id` - Get director details
- `GET /directors/:id/movies` - Get director's filmography
- `GET /directors/:id/similar` - Get similar directors
- `GET /directors/:id/timeline` - Get director's career timeline
- `GET /directors/popular` - Get popular directors
- `GET /directors/acclaimed` - Get highly rated directors

### Search
- `GET /search` - Universal search across all entities
- `GET /search/quick` - Quick search for autocomplete
- `GET /search/trending` - Get trending searches
- `GET /search/suggestions` - Get search suggestions
- `GET /search/filters` - Get available filter options

### Lists
- `GET /lists` - Get user's lists
- `POST /lists` - Create new list
- `GET /lists/:id` - Get list details
- `PUT /lists/:id` - Update list
- `DELETE /lists/:id` - Delete list
- `POST /lists/:id/items` - Add item to list
- `DELETE /lists/:id/items/:itemId` - Remove item from list
- `POST /lists/:id/reorder` - Reorder list items
- `GET /lists/public` - Get public lists

### User
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `GET /users/favorites/movies` - Get favorite movies
- `GET /users/favorites/actors` - Get favorite actors
- `GET /users/favorites/directors` - Get favorite directors
- `POST /users/favorites` - Add to favorites
- `DELETE /users/favorites/:type/:itemId` - Remove from favorites
- `GET /users/ratings` - Get user's ratings
- `GET /users/stats` - Get user statistics
- `POST /users/import` - Import data from external service
- `GET /users/watchlist` - Get watchlist
- `POST /users/watchlist` - Add to watchlist

### Health
- `GET /health` - Basic health check
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

## Swagger Documentation

When the server is running, you can access the interactive API documentation at:
```
http://localhost:3001/api/v1/docs
```

## Environment Variables

See `.env.example` for required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (optional)
- `JWT_SECRET` - Secret for JWT tokens
- `TMDB_API_KEY` - TMDB API key
- `TMDB_READ_ACCESS_TOKEN` - TMDB read access token
- `EMAIL_SERVICE_API_KEY` - Email service API key
- `PORT` - Server port (default: 3001)
- `HOST` - Server host (default: 0.0.0.0)

## Running the API

```bash
# Install dependencies
npm install

# Setup database
npm run migrate

# Development mode
npm run dev

# Production build
npm run build
npm start
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=MovieService
```

## Documentation Generation

```bash
# Generate documentation
npm run docs

# Documentation will be available in docs/ directory
```