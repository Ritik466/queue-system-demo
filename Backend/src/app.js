import express from "express";
import cors from "cors";
import queueRoutes from "./modules/queue/queue.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/queue", queueRoutes);

export default app;
