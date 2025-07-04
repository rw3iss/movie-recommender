# Movie Recommendation System

A comprehensive movie recommendation platform built with React 19 and Fastify, featuring personalized recommendations, advanced search capabilities, and social features.

## 🎬 Features

- **Personalized Recommendations**: ML-powered recommendation engine using collaborative filtering and content-based strategies
- **Advanced Search**: Search movies, actors, and directors with real-time filtering
- **User Lists**: Create and manage custom movie lists
- **Ratings & Reviews**: Rate movies and write reviews
- **Import Data**: Import ratings from IMDB, Letterboxd, and other services
- **Progressive Web App**: Offline support, installable, mobile-responsive
- **Theme Support**: Light and dark mode with system preference detection
- **Social Features**: Public lists, favorite tracking, activity feed

## 🏗️ Architecture

The application follows SOLID principles and clean architecture patterns:

- **Frontend**: React 19 with TypeScript, Material UI, SCSS modules
- **Backend**: Fastify with TypeScript, PostgreSQL, Redis
- **Infrastructure**: Docker, Docker Compose, Nginx

### Key Design Patterns

1. **Service Layer Pattern**: Business logic separated from controllers
2. **Repository Pattern**: Database operations abstracted in services
3. **Strategy Pattern**: Pluggable recommendation algorithms
4. **Dependency Injection**: Services injected into controllers
5. **Cache-Aside Pattern**: Multi-level caching strategy

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis (optional, or use Docker)

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/movie-recommender.git
cd movie-recommender

# Copy environment files
cp api/.env.example api/.env
cp app/.env.example app/.env

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec api npm run migrate

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:3001
# pgAdmin: http://localhost:5050 (optional)
```

### Manual Setup

#### Backend Setup

```bash
cd api

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

#### Frontend Setup

```bash
cd app

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development server
npm run dev
```

## 📁 Project Structure

```
movie-recommender/
├── api/                    # Backend API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── engine/         # Recommendation engine
│   │   ├── routes/         # API routes
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   ├── migrations/         # Database migrations
│   └── scripts/            # Utility scripts
├── app/                    # Frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom hooks
│   │   ├── styles/         # SCSS styles
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
└── docker-compose.yaml     # Docker configuration
```

## 🔧 Configuration

### Environment Variables

#### API (.env)

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/movie_rec

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production

# TMDB API
TMDB_API_KEY=your-api-key
TMDB_READ_ACCESS_TOKEN=your-access-token

# Email (optional)
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your-api-key
```

#### App (.env)

```env
API_URL=http://localhost:3001
```

## 📚 API Documentation

When the API server is running, access the interactive documentation:
- Swagger UI: http://localhost:3001/api/v1/docs
- Health Check: http://localhost:3001/api/v1/health

### Key Endpoints

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/movies/search` - Search movies
- `GET /api/v1/movies/:id` - Get movie details
- `GET /api/v1/movies/recommendations` - Get personalized recommendations
- `POST /api/v1/movies/:id/rate` - Rate a movie
- `GET /api/v1/lists` - Get user lists
- `POST /api/v1/lists` - Create new list

## 🧪 Testing

```bash
# Run API tests
cd api
npm test

# Run frontend tests
cd app
npm test

# Run e2e tests
npm run test:e2e
```

## 📖 Documentation

Generate technical documentation:

```bash
# API documentation
cd api
npm run docs

# Frontend documentation
cd app
npm run docs
```

## 🚢 Deployment

### Production Build

```bash
# Build API
cd api
npm run build

# Build frontend
cd app
npm run build
```

### Docker Production

```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yaml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- TMDB API for movie data
- React team for React 19
- Fastify team for the amazing framework
- All contributors and testers

## 📧 Contact

- Project Link: [https://github.com/yourusername/movie-recommender](https://github.com/yourusername/movie-recommender)
- Issues: [https://github.com/yourusername/movie-recommender/issues](https://github.com/yourusername/movie-recommender/issues)