import express from "express";
import { auth } from "../../../middleware/index.js";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  deleteInvoice,
  addPaymentsForInvoice,
} from "../../../controllers/invoice.controller.js";

const router = express.Router();
router.use(auth);

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoiceById);
router.delete("/:id", deleteInvoice);
router.post("/add-payment", addPaymentsForInvoice);

export default router;
