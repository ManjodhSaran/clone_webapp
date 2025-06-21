import { Router } from "express";
import { generateContentFromWord } from "../controllers/study.js";
import { generateHtmlContentFromWord } from "../controllers/study2.js";

const router = Router();

router.get("/generate/:word", generateContentFromWord)
router.get("/generate/html/:word", generateHtmlContentFromWord)

export default router;
