import { Database } from "sqlite3";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import {
    Movie,
    DatabaseMovie,
    UserRating,
    DatabaseUserRating,
    UserList,
    DatabaseUserList,
    ListItem,
    DatabaseListItem,
} from "../types";

/**
 * Database service following Single Responsibility Principle
 * Handles all database operations with SQLite using TypeScript
 */
export class DatabaseService {
    private db: Database | null = null;
    private dbPath: string;

    constructor(dbPath: string = "./data/movies.db") {
        this.dbPath = dbPath;
    }

    async initialize(): Promise<void> {
        // Ensure data directory exists
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Open database connection
        this.db = new Database(this.dbPath);

        // Promisify database methods
        const run = promisify(this.db.run.bind(this.db));
        const get = promisify(this.db.get.bind(this.db));
        const all = promisify(this.db.all.bind(this.db));

        // Attach promisified methods
        (this.db as any).runAsync = run;
        (this.db as any).getAsync = get;
        (this.db as any).allAsync = all;

        // Create tables
        await this.createTables();
    }

    private async createTables(): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        // Movies table
        await (this.db as any).runAsync(`
      CREATE TABLE IF NOT EXISTS movies (
        imdb_id TEXT PRIMARY KEY,
        tmdb_id INTEGER,
        title TEXT NOT NULL,
        year INTEGER,
        genre TEXT,
        director TEXT,
        plot TEXT,
        imdb_rating REAL,
        runtime TEXT,
        actors TEXT,
        poster_url TEXT,
        backdrop_url TEXT,
        release_date TEXT,
        vote_count INTEGER,
        budget INTEGER,
        revenue INTEGER,
        homepage TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // User ratings table
        await (this.db as any).runAsync(`
      CREATE TABLE IF NOT EXISTS user_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imdb_id TEXT NOT NULL,
        title TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
        review TEXT,
        date_rated DATETIME NOT NULL,
        source TEXT DEFAULT 'manual',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (imdb_id) REFERENCES movies (imdb_id)
      )
    `);

        // User lists table
        await (this.db as any).runAsync(`
      CREATE TABLE IF NOT EXISTS user_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // List items table
        await (this.db as any).runAsync(`
      CREATE TABLE IF NOT EXISTS list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL,
        item_type TEXT NOT NULL CHECK (item_type IN ('movie', 'actor', 'director')),
        item_id TEXT NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        image_url TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES user_lists (id) ON DELETE CASCADE,
        UNIQUE(list_id, item_type, item_id)
      )
    `);

        // User preferences table
        await (this.db as any).runAsync(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        preference_key TEXT NOT NULL UNIQUE,
        preference_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create indexes for better performance
        await (this.db as any).runAsync(`CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies (genre)`);
        await (this.db as any).runAsync(`CREATE INDEX IF NOT EXISTS idx_movies_year ON movies (year)`);
        await (this.db as any).runAsync(`CREATE INDEX IF NOT EXISTS idx_movies_director ON movies (director)`);
        await (this.db as any).runAsync(`CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies (tmdb_id)`);
        await (this.db as any).runAsync(
            `CREATE INDEX IF NOT EXISTS idx_user_ratings_imdb_id ON user_ratings (imdb_id)`
        );
        await (this.db as any).runAsync(`CREATE INDEX IF NOT EXISTS idx_user_ratings_rating ON user_ratings (rating)`);
        await (this.db as any).runAsync(`CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items (list_id)`);
        await (this.db as any).runAsync(`CREATE INDEX IF NOT EXISTS idx_list_items_type ON list_items (item_type)`);
    }

    // Movie operations
    async saveMovie(movieData: Movie): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        const {
            imdbId,
            tmdbId,
            title,
            year,
            genre,
            director,
            plot,
            imdbRating,
            runtime,
            actors,
            posterUrl,
            backdropUrl,
            releaseDate,
            voteCount,
            budget,
            revenue,
            homepage,
        } = movieData;

        await (this.db as any).runAsync(
            `
      INSERT OR REPLACE INTO movies
      (imdb_id, tmdb_id, title, year, genre, director, plot, imdb_rating, runtime, actors,
       poster_url, backdrop_url, release_date, vote_count, budget, revenue, homepage, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
            [
                imdbId,
                tmdbId,
                title,
                year,
                genre,
                director,
                plot,
                imdbRating,
                runtime,
                actors,
                posterUrl,
                backdropUrl,
                releaseDate,
                voteCount,
                budget,
                revenue,
                homepage,
            ]
        );
    }

    async getMovie(imdbId: string): Promise<Movie | null> {
        if (!this.db) throw new Error("Database not initialized");

        const row: DatabaseMovie = await (this.db as any).getAsync(
            `
      SELECT * FROM movies WHERE imdb_id = ?
    `,
            [imdbId]
        );

        return row ? this.mapDatabaseMovieToMovie(row) : null;
    }

    async getAllMovies(): Promise<Movie[]> {
        if (!this.db) throw new Error("Database not initialized");

        const rows: DatabaseMovie[] = await (this.db as any).allAsync(`
      SELECT * FROM movies ORDER BY title
    `);

        return rows.map((row) => this.mapDatabaseMovieToMovie(row));
    }

    async searchMovies(query: string): Promise<Movie[]> {
        if (!this.db) throw new Error("Database not initialized");

        const rows: DatabaseMovie[] = await (this.db as any).allAsync(
            `
      SELECT * FROM movies
      WHERE title LIKE ? OR genre LIKE ? OR plot LIKE ?
      ORDER BY title
      LIMIT 50
    `,
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );

        return rows.map((row) => this.mapDatabaseMovieToMovie(row));
    }

    async searchMoviesByDirector(query: string): Promise<Movie[]> {
        if (!this.db) throw new Error("Database not initialized");

        const rows: DatabaseMovie[] = await (this.db as any).allAsync(
            `
      SELECT * FROM movies
      WHERE director LIKE ?
      ORDER BY title
      LIMIT 50
    `,
            [`%${query}%`]
        );

        return rows.map((row) => this.mapDatabaseMovieToMovie(row));
    }

    async searchMoviesByActor(query: string): Promise<Movie[]> {
        if (!this.db) throw new Error("Database not initialized");

        const rows: DatabaseMovie[] = await (this.db as any).allAsync(
            `
      SELECT * FROM movies
      WHERE actors LIKE ?
      ORDER BY title
      LIMIT 50
    `,
            [`%${query}%`]
        );

        return rows.map((row) => this.mapDatabaseMovieToMovie(row));
    }

    // User rating operations
    async saveUserRating(ratingData: UserRating): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        const { imdbId, title, rating, review, dateRated, source = "manual" } = ratingData;

        // First, try to update existing rating
        const existingRating = await (this.db as any).getAsync(
            `
      SELECT id FROM user_ratings WHERE imdb_id = ?
    `,
            [imdbId]
        );

        if (existingRating) {
            await (this.db as any).runAsync(
                `
        UPDATE user_ratings
        SET rating = ?, review = ?, date_rated = ?, source = ?
        WHERE imdb_id = ?
      `,
                [rating, review, dateRated, source, imdbId]
            );
        } else {
            await (this.db as any).runAsync(
                `
        INSERT INTO user_ratings (imdb_id, title, rating, review, date_rated, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
                [imdbId, title, rating, review, dateRated, source]
            );
        }
    }

    async getUserRatings(): Promise<UserRating[]> {
        if (!this.db) throw new Error("Database not initialized");

        const rows: DatabaseUserRating[] = await (this.db as any).allAsync(`
      SELECT ur.*, m.genre, m.director, m.year, m.plot
      FROM user_ratings ur
      LEFT JOIN movies m ON ur.imdb_id = m.imdb_id
      ORDER BY ur.date_rated DESC
    `);

        return rows.map((row) => this.mapDatabaseUserRatingToUserRating(row));
    }

    async getUserRating(imdbId: string): Promise<UserRating | null> {
        if (!this.db) throw new Error("Database not initialized");

        const row: DatabaseUserRating = await (this.db as any).getAsync(
            `
      SELECT ur.*, m.genre, m.director, m.year, m.plot
      FROM user_ratings ur
      LEFT JOIN movies m ON ur.imdb_id = m.imdb_id
      WHERE ur.imdb_id = ?
    `,
            [imdbId]
        );

        return row ? this.mapDatabaseUserRatingToUserRating(row) : null;
    }

    async deleteUserRating(imdbId: string): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        await (this.db as any).runAsync(
            `
      DELETE FROM user_ratings WHERE imdb_id = ?
    `,
            [imdbId]
        );
    }

    // User lists operations
    async createUserList(name: string, description?: string): Promise<number> {
        if (!this.db) throw new Error("Database not initialized");

        const result = await (this.db as any).runAsync(
            `
      INSERT INTO user_lists (name, description)
      VALUES (?, ?)
    `,
            [name, description]
        );

        return result.lastID;
    }

    async getUserLists(): Promise<UserList[]> {
        if (!this.db) throw new Error("Database not initialized");

        const rows: DatabaseUserList[] = await (this.db as any).allAsync(`
      SELECT ul.*, COUNT(li.id) as item_count
      FROM user_lists ul
      LEFT JOIN list_items li ON ul.id = li.list_id
      GROUP BY ul.id
      ORDER BY ul.created_at DESC
    `);

        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            itemCount: (row as any).item_count || 0,
        }));
    }

    async getUserList(listId: number): Promise<UserList | null> {
        if (!this.db) throw new Error("Database not initialized");

        const row: DatabaseUserList = await (this.db as any).getAsync(
            `
      SELECT * FROM user_lists WHERE id = ?
    `,
            [listId]
        );

        return row
            ? {
                  id: row.id,
                  name: row.name,
                  description: row.description,
                  createdAt: row.created_at,
                  updatedAt: row.updated_at,
              }
            : null;
    }

    async updateUserList(listId: number, name: string, description?: string): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        await (this.db as any).runAsync(
            `
      UPDATE user_lists
      SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
            [name, description, listId]
        );
    }

    async deleteUserList(listId: number): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        await (this.db as any).runAsync(
            `
      DELETE FROM user_lists WHERE id = ?
    `,
            [listId]
        );
    }

    // List items operations
    async addItemToList(listId: number, item: Omit<ListItem, "id" | "listId" | "addedAt">): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        await (this.db as any).runAsync(
            `
      INSERT OR REPLACE INTO list_items (list_id, item_type, item_id, title, subtitle, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
            [listId, item.itemType, item.itemId, item.title, item.subtitle, item.imageUrl]
        );
    }

    async getListItems(listId: number): Promise<ListItem[]> {
        if (!this.db) throw new Error("Database not initialized");

        const rows: DatabaseListItem[] = await (this.db as any).allAsync(
            `
      SELECT * FROM list_items WHERE list_id = ? ORDER BY added_at DESC
    `,
            [listId]
        );

        return rows.map((row) => ({
            id: row.id,
            listId: row.list_id,
            itemType: row.item_type,
            itemId: row.item_id,
            title: row.title,
            subtitle: row.subtitle,
            imageUrl: row.image_url,
            addedAt: row.added_at,
        }));
    }

    async removeItemFromList(listId: number, itemType: string, itemId: string): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        await (this.db as any).runAsync(
            `
      DELETE FROM list_items WHERE list_id = ? AND item_type = ? AND item_id = ?
    `,
            [listId, itemType, itemId]
        );
    }

    // User preferences operations
    async saveUserPreference(key: string, value: any): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");

        await (this.db as any).runAsync(
            `
      INSERT OR REPLACE INTO user_preferences (preference_key, preference_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `,
            [key, JSON.stringify(value)]
        );
    }

    async getUserPreference(key: string): Promise<any> {
        if (!this.db) throw new Error("Database not initialized");

        const result = await (this.db as any).getAsync(
            `
      SELECT preference_value FROM user_preferences WHERE preference_key = ?
    `,
            [key]
        );

        return result ? JSON.parse(result.preference_value) : null;
    }

    async getAllUserPreferences(): Promise<Record<string, any>> {
        if (!this.db) throw new Error("Database not initialized");

        const results = await (this.db as any).allAsync(`
      SELECT preference_key, preference_value FROM user_preferences
    `);

        const preferences: Record<string, any> = {};
        results.forEach((row: any) => {
            preferences[row.preference_key] = JSON.parse(row.preference_value);
        });

        return preferences;
    }

    // Statistics
    async getStatistics(): Promise<any> {
        if (!this.db) throw new Error("Database not initialized");

        const totalMovies = await (this.db as any).getAsync(`SELECT COUNT(*) as count FROM movies`);
        const totalRatings = await (this.db as any).getAsync(`SELECT COUNT(*) as count FROM user_ratings`);
        const avgRating = await (this.db as any).getAsync(`SELECT AVG(rating) as avg FROM user_ratings`);
        const topGenres = await (this.db as any).allAsync(`
      SELECT m.genre, COUNT(*) as count, AVG(ur.rating) as avg_rating
      FROM user_ratings ur
      JOIN movies m ON ur.imdb_id = m.imdb_id
      WHERE m.genre IS NOT NULL
      GROUP BY m.genre
      ORDER BY count DESC
      LIMIT 5
    `);

        return {
            totalMovies: totalMovies.count,
            totalRatings: totalRatings.count,
            averageRating: avgRating.avg ? parseFloat(avgRating.avg).toFixed(1) : 0,
            topGenres,
        };
    }

    async close(): Promise<void> {
        if (this.db) {
            await new Promise<void>((resolve, reject) => {
                this.db!.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            this.db = null;
        }
    }

    // Helper methods for mapping database objects to domain objects
    private mapDatabaseMovieToMovie(dbMovie: DatabaseMovie): Movie {
        return {
            imdbId: dbMovie.imdb_id,
            tmdbId: dbMovie.tmdb_id,
            title: dbMovie.title,
            year: dbMovie.year,
            genre: dbMovie.genre,
            director: dbMovie.director,
            plot: dbMovie.plot,
            imdbRating: dbMovie.imdb_rating,
            runtime: dbMovie.runtime,
            actors: dbMovie.actors,
            posterUrl: dbMovie.poster_url,
            backdropUrl: dbMovie.backdrop_url,
            releaseDate: dbMovie.release_date,
            voteCount: dbMovie.vote_count,
            budget: dbMovie.budget,
            revenue: dbMovie.revenue,
            homepage: dbMovie.homepage,
            createdAt: dbMovie.created_at,
            updatedAt: dbMovie.updated_at,
        };
    }

    private mapDatabaseUserRatingToUserRating(dbRating: DatabaseUserRating): UserRating {
        return {
            id: dbRating.id,
            imdbId: dbRating.imdb_id,
            title: dbRating.title,
            rating: dbRating.rating,
            review: dbRating.review,
            dateRated: dbRating.date_rated,
            source: dbRating.source,
            createdAt: dbRating.created_at,
        };
    }
}
