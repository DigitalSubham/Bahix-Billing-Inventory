import express from "express";
import authRoute from "./auth/auth.routes.js";
import customerRoute from "./customer/customers.routes.js";
import invoiceRoute from "./invoice/invoice.routes.js";
import productRoute from "./product/products.routes.js";
import generalRoute from "./general/general.routes.js";
import salesmanRoute from "./salesman/salesman.routes.js";

const router = express.Router();
router.use("/auth", authRoute);
router.use("/customers", customerRoute);
router.use("/invoices", invoiceRoute);
router.use("/products", productRoute);
router.use("/general", generalRoute);
router.use("/salesman", salesmanRoute);

export default router;
