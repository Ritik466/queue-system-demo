import { Router } from "express";
import * as controller from "./queue.controller.js";

const router = Router();

router.post("/join", controller.joinQueue);
router.post("/serve", controller.serveNext);
router.get("/status", controller.getStatus);

export default router;
