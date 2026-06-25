import express from "express";
import { auth } from "../../../middleware/auth.js";
import {
  getDashboard,
  dropDown,
} from "../../../controllers/dashboard.controller.js";

const router = express.Router();
router.use(auth);

router.get("/", getDashboard);
router.post("/dropdown", dropDown);

export default router;
