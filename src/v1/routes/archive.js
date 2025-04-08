import { Router } from "express";
import { archiverWeb, downloadArchive } from "../controllers/archive.js";

const router = Router();

router.post("/", archiverWeb)
router.get("/download/:filename", downloadArchive);

export default router;
