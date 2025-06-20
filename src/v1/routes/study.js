import { Router } from "express";
import { generateContentFromWord } from "../controllers/study.js";

const router = Router();

router.get("/generate/:word", generateContentFromWord)

export default router;
