import { pool } from "../../config/db.js";

export async function getSession() {
    const { rows } = await pool.query(
        "SELECT * FROM queue_session WHERE id = 1"
    );
    return rows[0];
}

export async function getWaitingCount() {
    const { rows } = await pool.query(
        "SELECT COUNT(*) as count FROM queue_tokens WHERE status = 'WAITING'"
    );
    return parseInt(rows[0].count);
}

export async function joinQueue() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const { rows } = await client.query(
            "SELECT current_token FROM queue_session WHERE id = 1 FOR UPDATE"
        );

        const newToken = rows[0].current_token + 1;

        await client.query(
            "UPDATE queue_session SET current_token = $1 WHERE id = 1",
            [newToken]
        );

        await client.query(
            "INSERT INTO queue_tokens (token_number, status) VALUES ($1, 'WAITING')",
            [newToken]
        );

        await client.query("COMMIT");

        return newToken;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function markTokenDone(tokenNumber) {
    await pool.query(
        "UPDATE queue_tokens SET status = 'DONE' WHERE token_number = $1",
        [tokenNumber]
    );
}

export async function updateServing(tokenNumber) {
    await pool.query(
        "UPDATE queue_session SET current_serving = $1 WHERE id = 1",
        [tokenNumber]
    );
}
