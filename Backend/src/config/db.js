import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

// Validate required environment variables
if (!process.env.DB_HOST) {
  throw new Error("DB_HOST environment variable is required");
}
if (!process.env.DB_USER) {
  throw new Error("DB_USER environment variable is required");
}
if (!process.env.DB_PASSWORD) {
  throw new Error("DB_PASSWORD environment variable is required");
}

export const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "queue_db",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => {
  console.log("PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});
