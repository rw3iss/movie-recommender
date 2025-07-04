#!/usr/bin/env tsx

import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import { config } from "../src/config";

/**
 * Database migration runner
 * Executes SQL migration files in order
 */
async function migrate() {
    const client = new Client({
        connectionString: config.DATABASE_URL,
    });

    try {
        console.log("🔗 Connecting to database...");
        await client.connect();
        console.log("✅ Connected to database");

        // Create migrations table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get list of migration files
        const migrationsDir = path.join(__dirname, "..", "migrations");
        const files = fs
            .readdirSync(migrationsDir)
            .filter((f) => f.endsWith(".sql"))
            .sort();

        console.log(`📁 Found ${files.length} migration files`);

        // Check which migrations have been run
        const result = await client.query("SELECT filename FROM migrations");
        const executedMigrations = new Set(result.rows.map((r) => r.filename));

        // Run pending migrations
        let pendingCount = 0;
        for (const file of files) {
            if (!executedMigrations.has(file)) {
                console.log(`🔄 Running migration: ${file}`);

                const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

                // Begin transaction
                await client.query("BEGIN");

                try {
                    // Execute migration
                    await client.query(sql);

                    // Record migration
                    await client.query("INSERT INTO migrations (filename) VALUES ($1)", [file]);

                    // Commit transaction
                    await client.query("COMMIT");

                    console.log(`✅ Migration completed: ${file}`);
                    pendingCount++;
                } catch (error) {
                    // Rollback on error
                    await client.query("ROLLBACK");
                    throw new Error(`Migration ${file} failed: ${error.message}`);
                }
            }
        }

        if (pendingCount === 0) {
            console.log("✅ All migrations are up to date");
        } else {
            console.log(`✅ Successfully ran ${pendingCount} migrations`);
        }
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Run migrations
migrate();
