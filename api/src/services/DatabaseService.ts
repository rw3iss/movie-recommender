import { Pool } from "pg";
import { Movie, UserRating, UserList, ListItem } from "../types";

/**
 * Database service following Single Responsibility Principle
 * Handles all database operations with PostgreSQL
 */
export class DatabaseService {
    constructor(private pool: Pool) {}

    // Movie operations
    async saveMovie(movieData: Movie): Promise<void> {
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

        await this.pool.query(
            `
            INSERT INTO movies
            (imdb_id, tmdb_id, title, year, plot, imdb_rating, runtime,
             poster_url, backdrop_url, release_date, vote_count, budget, revenue, homepage)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (imdb_id) DO UPDATE SET
                tmdb_id = EXCLUDED.tmdb_id,
                title = EXCLUDED.title,
                year = EXCLUDED.year,
                plot = EXCLUDED.plot,
                imdb_rating = EXCLUDED.imdb_rating,
                runtime = EXCLUDED.runtime,
                poster_url = EXCLUDED.poster_url,
                backdrop_url = EXCLUDED.backdrop_url,
                release_date = EXCLUDED.release_date,
                vote_count = EXCLUDED.vote_count,
                budget = EXCLUDED.budget,
                revenue = EXCLUDED.revenue,
                homepage = EXCLUDED.homepage,
                updated_at = CURRENT_TIMESTAMP
            `,
            [
                imdbId,
                tmdbId,
                title,
                year,
                plot,
                imdbRating,
                runtime,
                posterUrl,
                backdropUrl,
                releaseDate,
                voteCount,
                budget,
                revenue,
                homepage,
            ]
        );

        // Handle genres
        if (genre) {
            const genres = genre.split(",").map((g) => g.trim());
            for (const genreName of genres) {
                // Insert genre if not exists
                await this.pool.query("INSERT INTO genres (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [
                    genreName,
                ]);

                // Link movie to genre
                await this.pool.query(
                    `
                    INSERT INTO movie_genres (movie_id, genre_id)
                    SELECT $1, id FROM genres WHERE name = $2
                    ON CONFLICT DO NOTHING
                    `,
                    [imdbId, genreName]
                );
            }
        }

        // Handle director
        if (director) {
            await this.savePersonAndLinkToMovie(director, imdbId, "Director");
        }

        // Handle actors
        if (actors) {
            const actorList = actors.split(",").map((a) => a.trim());
            for (let i = 0; i < actorList.length; i++) {
                await this.savePersonAndLinkToMovie(actorList[i], imdbId, "Actor", i);
            }
        }
    }

    private async savePersonAndLinkToMovie(
        name: string,
        movieId: string,
        role: "Director" | "Actor",
        order?: number
    ): Promise<void> {
        // Insert person if not exists
        const personResult = await this.pool.query(
            "INSERT INTO people (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = $1 RETURNING id",
            [name]
        );
        const personId = personResult.rows[0].id;

        if (role === "Director") {
            await this.pool.query(
                `
                INSERT INTO movie_crew (movie_id, person_id, department, job)
                VALUES ($1, $2, 'Directing', 'Director')
                ON CONFLICT DO NOTHING
                `,
                [movieId, personId]
            );
        } else {
            await this.pool.query(
                `
                INSERT INTO movie_cast (movie_id, person_id, character_name, cast_order)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
                `,
                [movieId, personId, "Unknown", order || 999]
            );
        }
    }

    async getMovie(imdbId: string): Promise<Movie | null> {
        const result = await this.pool.query(
            `
            SELECT m.*,
                   array_agg(DISTINCT g.name) as genres,
                   array_agg(DISTINCT CASE WHEN mc.job = 'Director' THEN p.name END) as directors
            FROM movies m
            LEFT JOIN movie_genres mg ON m.imdb_id = mg.movie_id
            LEFT JOIN genres g ON mg.genre_id = g.id
            LEFT JOIN movie_crew mc ON m.imdb_id = mc.movie_id AND mc.job = 'Director'
            LEFT JOIN people p ON mc.person_id = p.id
            WHERE m.imdb_id = $1
            GROUP BY m.imdb_id
            `,
            [imdbId]
        );

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return this.mapDatabaseMovieToMovie(row);
    }

    async getAllMovies(): Promise<Movie[]> {
        const result = await this.pool.query(`
            SELECT m.*,
                   array_agg(DISTINCT g.name) as genres,
                   array_agg(DISTINCT CASE WHEN mc.job = 'Director' THEN p.name END) as directors
            FROM movies m
            LEFT JOIN movie_genres mg ON m.imdb_id = mg.movie_id
            LEFT JOIN genres g ON mg.genre_id = g.id
            LEFT JOIN movie_crew mc ON m.imdb_id = mc.movie_id AND mc.job = 'Director'
            LEFT JOIN people p ON mc.person_id = p.id
            GROUP BY m.imdb_id
            ORDER BY m.title
        `);

        return result.rows.map((row) => this.mapDatabaseMovieToMovie(row));
    }

    async searchMovies(query: string): Promise<Movie[]> {
        const result = await this.pool.query(
            `
            SELECT m.*,
                   array_agg(DISTINCT g.name) as genres,
                   array_agg(DISTINCT CASE WHEN mc.job = 'Director' THEN p.name END) as directors
            FROM movies m
            LEFT JOIN movie_genres mg ON m.imdb_id = mg.movie_id
            LEFT JOIN genres g ON mg.genre_id = g.id
            LEFT JOIN movie_crew mc ON m.imdb_id = mc.movie_id AND mc.job = 'Director'
            LEFT JOIN people p ON mc.person_id = p.id
            WHERE m.title ILIKE $1 OR m.plot ILIKE $1
            GROUP BY m.imdb_id
            ORDER BY m.title
            LIMIT 50
            `,
            [`%${query}%`]
        );

        return result.rows.map((row) => this.mapDatabaseMovieToMovie(row));
    }

    async searchMoviesByDirector(query: string): Promise<Movie[]> {
        const result = await this.pool.query(
            `
            SELECT DISTINCT m.*,
                   array_agg(DISTINCT g.name) as genres,
                   array_agg(DISTINCT CASE WHEN mc.job = 'Director' THEN p.name END) as directors
            FROM movies m
            LEFT JOIN movie_genres mg ON m.imdb_id = mg.movie_id
            LEFT JOIN genres g ON mg.genre_id = g.id
            LEFT JOIN movie_crew mc ON m.imdb_id = mc.movie_id
            LEFT JOIN people p ON mc.person_id = p.id
            WHERE p.name ILIKE $1 AND mc.job = 'Director'
            GROUP BY m.imdb_id
            ORDER BY m.title
            LIMIT 50
            `,
            [`%${query}%`]
        );

        return result.rows.map((row) => this.mapDatabaseMovieToMovie(row));
    }

    async searchMoviesByActor(query: string): Promise<Movie[]> {
        const result = await this.pool.query(
            `
            SELECT DISTINCT m.*,
                   array_agg(DISTINCT g.name) as genres,
                   array_agg(DISTINCT CASE WHEN mc.job = 'Director' THEN pd.name END) as directors
            FROM movies m
            LEFT JOIN movie_genres mg ON m.imdb_id = mg.movie_id
            LEFT JOIN genres g ON mg.genre_id = g.id
            LEFT JOIN movie_cast mca ON m.imdb_id = mca.movie_id
            LEFT JOIN people pa ON mca.person_id = pa.id
            LEFT JOIN movie_crew mc ON m.imdb_id = mc.movie_id AND mc.job = 'Director'
            LEFT JOIN people pd ON mc.person_id = pd.id
            WHERE pa.name ILIKE $1
            GROUP BY m.imdb_id
            ORDER BY m.title
            LIMIT 50
            `,
            [`%${query}%`]
        );

        return result.rows.map((row) => this.mapDatabaseMovieToMovie(row));
    }

    // User rating operations
    async saveUserRating(userId: string, ratingData: UserRating): Promise<void> {
        const { imdbId, title, rating, review, dateRated } = ratingData;

        await this.pool.query(
            `
            INSERT INTO user_ratings (user_id, movie_id, rating, review, date_rated)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, movie_id) DO UPDATE SET
                rating = EXCLUDED.rating,
                review = EXCLUDED.review,
                date_rated = EXCLUDED.date_rated,
                updated_at = CURRENT_TIMESTAMP
            `,
            [userId, imdbId, rating, review, dateRated || new Date()]
        );
    }

    async getUserRatings(userId: string): Promise<UserRating[]> {
        const result = await this.pool.query(
            `
            SELECT ur.*, m.title
            FROM user_ratings ur
            JOIN movies m ON ur.movie_id = m.imdb_id
            WHERE ur.user_id = $1
            ORDER BY ur.date_rated DESC
            `,
            [userId]
        );

        return result.rows.map((row) => ({
            id: row.id,
            imdbId: row.movie_id,
            title: row.title,
            rating: parseFloat(row.rating),
            review: row.review,
            dateRated: row.date_rated,
            createdAt: row.created_at,
        }));
    }

    async getUserRating(userId: string, imdbId: string): Promise<UserRating | null> {
        const result = await this.pool.query(
            `
            SELECT ur.*, m.title
            FROM user_ratings ur
            JOIN movies m ON ur.movie_id = m.imdb_id
            WHERE ur.user_id = $1 AND ur.movie_id = $2
            `,
            [userId, imdbId]
        );

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            id: row.id,
            imdbId: row.movie_id,
            title: row.title,
            rating: parseFloat(row.rating),
            review: row.review,
            dateRated: row.date_rated,
            createdAt: row.created_at,
        };
    }

    async deleteUserRating(userId: string, imdbId: string): Promise<void> {
        await this.pool.query("DELETE FROM user_ratings WHERE user_id = $1 AND movie_id = $2", [userId, imdbId]);
    }

    // User lists operations
    async createUserList(userId: string, name: string, description?: string): Promise<number> {
        const result = await this.pool.query(
            `
            INSERT INTO user_lists (user_id, name, description)
            VALUES ($1, $2, $3)
            RETURNING id
            `,
            [userId, name, description]
        );

        return result.rows[0].id;
    }

    async getUserLists(userId: string): Promise<UserList[]> {
        const result = await this.pool.query(
            `
            SELECT ul.*, COUNT(li.id) as item_count
            FROM user_lists ul
            LEFT JOIN list_items li ON ul.id = li.list_id
            WHERE ul.user_id = $1
            GROUP BY ul.id
            ORDER BY ul.created_at DESC
            `,
            [userId]
        );

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            itemCount: parseInt(row.item_count),
        }));
    }

    async getUserList(listId: number): Promise<UserList | null> {
        const result = await this.pool.query("SELECT * FROM user_lists WHERE id = $1", [listId]);

        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async updateUserList(listId: number, name: string, description?: string): Promise<void> {
        await this.pool.query(
            `
            UPDATE user_lists
            SET name = $2, description = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [listId, name, description]
        );
    }

    async deleteUserList(listId: number): Promise<void> {
        await this.pool.query("DELETE FROM user_lists WHERE id = $1", [listId]);
    }

    // List items operations
    async addItemToList(listId: number, item: Omit<ListItem, "id" | "listId" | "addedAt">): Promise<void> {
        // Get next position
        const posResult = await this.pool.query(
            "SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM list_items WHERE list_id = $1",
            [listId]
        );
        const position = posResult.rows[0].next_pos;

        await this.pool.query(
            `
            INSERT INTO list_items (list_id, item_type, item_id, position, notes)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (list_id, item_type, item_id) DO UPDATE SET
                notes = EXCLUDED.notes
            `,
            [listId, item.itemType, item.itemId, position, item.subtitle]
        );
    }

    async getListItems(listId: number): Promise<ListItem[]> {
        const result = await this.pool.query(
            `
            SELECT * FROM list_items
            WHERE list_id = $1
            ORDER BY position, added_at DESC
            `,
            [listId]
        );

        return result.rows.map((row) => ({
            id: row.id,
            listId: row.list_id,
            itemType: row.item_type,
            itemId: row.item_id,
            title: row.item_id, // This would need to be joined with actual data
            subtitle: row.notes,
            imageUrl: undefined,
            addedAt: row.added_at,
        }));
    }

    async removeItemFromList(listId: number, itemType: string, itemId: string): Promise<void> {
        await this.pool.query("DELETE FROM list_items WHERE list_id = $1 AND item_type = $2 AND item_id = $3", [
            listId,
            itemType,
            itemId,
        ]);
    }

    // User preferences operations
    async saveUserPreference(userId: string, key: string, value: any): Promise<void> {
        await this.pool.query(
            `
            INSERT INTO user_preferences (user_id, ${key})
            VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET
                ${key} = EXCLUDED.${key},
                updated_at = CURRENT_TIMESTAMP
            `,
            [userId, value]
        );
    }

    async getUserPreference(userId: string, key: string): Promise<any> {
        const result = await this.pool.query(`SELECT ${key} FROM user_preferences WHERE user_id = $1`, [userId]);

        return result.rows.length > 0 ? result.rows[0][key] : null;
    }

    async getAllUserPreferences(userId: string): Promise<Record<string, any>> {
        const result = await this.pool.query("SELECT * FROM user_preferences WHERE user_id = $1", [userId]);

        return result.rows.length > 0 ? result.rows[0] : {};
    }

    // User management
    async createUser(userData: any): Promise<any> {
        const result = await this.pool.query(
            `
            INSERT INTO users (email, username, password, email_verified, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, username, email_verified, role, created_at, updated_at
            `,
            [
                userData.email,
                userData.username,
                userData.password,
                userData.emailVerified || false,
                userData.role || "user",
            ]
        );

        return result.rows[0];
    }

    async findUserByEmail(email: string): Promise<any> {
        const result = await this.pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async findUserById(userId: string, includePassword: boolean = false): Promise<any> {
        const query = includePassword
            ? "SELECT * FROM users WHERE id = $1"
            : "SELECT id, email, username, email_verified, role, created_at, updated_at FROM users WHERE id = $1";

        const result = await this.pool.query(query, [userId]);

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async findUserByUsername(username: string): Promise<any> {
        const result = await this.pool.query("SELECT id, email, username FROM users WHERE username = $1", [username]);

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async updateUser(userId: string, data: any): Promise<any> {
        const fields = Object.keys(data)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(", ");
        const values = Object.values(data);

        const result = await this.pool.query(
            `
            UPDATE users
            SET ${fields}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, email, username, email_verified, role, created_at, updated_at
            `,
            [userId, ...values]
        );

        return result.rows[0];
    }

    async deleteUser(userId: string): Promise<void> {
        await this.pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }

    // Token management
    async saveRefreshToken(userId: string, token: string): Promise<void> {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        await this.pool.query(
            `
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            `,
            [userId, token, expiresAt]
        );
    }

    async findRefreshToken(token: string): Promise<any> {
        const result = await this.pool.query("SELECT * FROM refresh_tokens WHERE token = $1", [token]);

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async deleteRefreshToken(token: string): Promise<void> {
        await this.pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
    }

    async deleteAllUserRefreshTokens(userId: string): Promise<void> {
        await this.pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
    }

    async saveVerificationToken(userId: string, token: string, type: string): Promise<void> {
        const expiresAt = new Date();
        if (type === "email_verification") {
            expiresAt.setDate(expiresAt.getDate() + 1); // 24 hours
        } else {
            expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour
        }

        await this.pool.query(
            `
            INSERT INTO verification_tokens (user_id, token, type, expires_at)
            VALUES ($1, $2, $3, $4)
            `,
            [userId, token, type, expiresAt]
        );
    }

    async findVerificationToken(token: string, type: string): Promise<any> {
        const result = await this.pool.query("SELECT * FROM verification_tokens WHERE token = $1 AND type = $2", [
            token,
            type,
        ]);

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async deleteVerificationToken(token: string): Promise<void> {
        await this.pool.query("DELETE FROM verification_tokens WHERE token = $1", [token]);
    }

    // OAuth
    async findUserByOAuth(provider: string, providerId: string): Promise<any> {
        const result = await this.pool.query(
            `
            SELECT u.* FROM users u
            JOIN oauth_accounts oa ON u.id = oa.user_id
            WHERE oa.provider = $1 AND oa.provider_account_id = $2
            `,
            [provider, providerId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    async linkOAuthAccount(userId: string, provider: string, providerId: string): Promise<void> {
        await this.pool.query(
            `
            INSERT INTO oauth_accounts (user_id, provider, provider_account_id)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
            `,
            [userId, provider, providerId]
        );
    }

    // Statistics
    async getStatistics(): Promise<any> {
        const [movies, ratings, avgRating, topGenres] = await Promise.all([
            this.pool.query("SELECT COUNT(*) as count FROM movies"),
            this.pool.query("SELECT COUNT(*) as count FROM user_ratings"),
            this.pool.query("SELECT AVG(rating) as avg FROM user_ratings"),
            this.pool.query(`
                SELECT g.name as genre, COUNT(*) as count, AVG(ur.rating) as avg_rating
                FROM user_ratings ur
                JOIN movies m ON ur.movie_id = m.imdb_id
                JOIN movie_genres mg ON m.imdb_id = mg.movie_id
                JOIN genres g ON mg.genre_id = g.id
                GROUP BY g.name
                ORDER BY count DESC
                LIMIT 5
            `),
        ]);

        return {
            totalMovies: parseInt(movies.rows[0].count),
            totalRatings: parseInt(ratings.rows[0].count),
            averageRating: avgRating.rows[0].avg ? parseFloat(avgRating.rows[0].avg).toFixed(1) : 0,
            topGenres: topGenres.rows,
        };
    }

    // Helper methods
    private mapDatabaseMovieToMovie(row: any): Movie {
        return {
            imdbId: row.imdb_id,
            tmdbId: row.tmdb_id,
            title: row.title,
            year: row.year,
            genre: row.genres ? row.genres.filter((g: any) => g).join(", ") : undefined,
            director: row.directors ? row.directors.find((d: any) => d) : undefined,
            plot: row.plot,
            imdbRating: row.imdb_rating ? parseFloat(row.imdb_rating) : undefined,
            runtime: row.runtime,
            actors: row.actors,
            posterUrl: row.poster_url,
            backdropUrl: row.backdrop_url,
            releaseDate: row.release_date,
            voteCount: row.vote_count,
            budget: row.budget,
            revenue: row.revenue,
            homepage: row.homepage,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
