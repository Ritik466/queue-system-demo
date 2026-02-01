import { pool } from "../config/db.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations() {
    const client = await pool.connect();

    try {
        const sql = readFileSync(join(__dirname, "001_init.sql"), "utf-8");
        await client.query(sql);
        console.log("✓ Migration 001_init.sql executed");
    } catch (err) {
        console.error("✗ Migration failed:", err);
        throw err;
    } finally {
        client.release();
    }
}
