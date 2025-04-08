import { Router } from "express";
import archive from "./archive.js";

const router = Router();

router.use("/archive", archive);

export default router;
