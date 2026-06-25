import express from "express";
import { auth } from "../../../middleware/index.js";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../../../controllers/customer.controller.js";

const router = express.Router();

router.use(auth); // All routes protected

router.post("/", createCustomer);
router.get("/", getCustomers);
router.get("/:id", getCustomerById);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;
