import * as service from "./queue.service.js";

export async function joinQueue(req, res) {
    try {
        const token = await service.joinQueue();
        res.json({ token });
    } catch (err) {
        console.error("Error joining queue:", err);
        res.status(500).json({ error: "Failed to join queue" });
    }
}

export async function serveNext(req, res) {
    try {
        const served = await service.serveNext();
        res.json({ served });
    } catch (err) {
        console.error("Error serving next:", err);
        res.status(500).json({ error: "Failed to serve next" });
    }
}

export async function getStatus(req, res) {
    try {
        const status = await service.getQueueStatus();
        res.json(status);
    } catch (err) {
        console.error("Error getting status:", err);
        res.status(500).json({ error: "Failed to get status" });
    }
}
