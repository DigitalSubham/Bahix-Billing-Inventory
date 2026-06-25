import express from "express";
import { auth } from "../../../middleware/auth.js";
import {
  register,
  login,
  getProfile,
  updateProfile,
} from "../../../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", auth, getProfile);
router.put("/profile", auth, updateProfile);

export default router;
