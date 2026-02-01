import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { initSocket } from "./sockets/queue.socket.js";
import { pool } from "./config/db.js";
import { runMigrations } from "./migrations/migrationRunner.js";
import dotenv from "dotenv";

dotenv.config();

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" },
});

initSocket(io);

const startServer = async () => {
    try {
        // Test database connection
        const client = await pool.connect();
        console.log("✓ Database connection successful");
        client.release();

        // Run migrations
        await runMigrations();
        console.log("✓ Migrations completed");

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, "0.0.0.0", () => {
            console.log(`✓ Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("✗ Failed to start server:", err.message || err);
        process.exit(1);
    }
};

startServer();
