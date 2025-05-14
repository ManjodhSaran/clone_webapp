import { Router } from "express";
import archive from "./archive.js";
// import auth from "./auth.js";
// import ui from "./ui.js";

const router = Router();

// router.use("/auth", auth);
router.use("/archive", archive);
// router.use("/ui", ui);

export default router;
