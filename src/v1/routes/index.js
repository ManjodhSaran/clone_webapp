import { Router } from "express";
import archive from "./archive.js";
import study from "./study.js";
import digital from "./digital.js";
// import auth from "./auth.js";
// import ui from "./ui.js";

const router = Router();

router.use("/digital", digital);
router.use("/archive", archive);
router.use("/study", study);
// router.use("/ui", ui);

export default router;
