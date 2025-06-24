import { Router } from "express";
import archive from "./archive.js";
import study from "./study.js";
// import auth from "./auth.js";
// import ui from "./ui.js";

const router = Router();

// router.use("/auth", auth);
router.use("/archive", archive);
router.use("/study", study);
// router.use("/ui", ui);

export default router;
