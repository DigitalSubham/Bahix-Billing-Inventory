import express from "express";
import { auth } from "../../../middleware/auth.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../../../controllers/products.controller.js";

const router = express.Router();
router.use(auth);

router.post("/", createProduct);
router.get("/", getProducts);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
