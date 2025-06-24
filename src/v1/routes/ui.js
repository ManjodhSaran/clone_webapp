import { Router } from "express";
import { login } from "../controllers/ui.js";

const router = Router();

router.post("/login", login)

export default router;
