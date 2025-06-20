import { Router } from "express";
import { generateContentFromWord, generateHtmlContentFromWord } from "../controllers/study.js";

const router = Router();

router.get("/generate/:word", generateContentFromWord)
router.get("/generate/html/:word", generateHtmlContentFromWord)

export default router;
