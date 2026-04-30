import { Router } from "express";
import { paymentsController } from "./payments.controller";
import { idempotency } from "@/middlewares/idempotency";

const router = Router();

// POST /payments/create-order - Create a new Razorpay order
router.post("/create-order", idempotency ,(req, res) => paymentsController.createOrder(req, res));

// POST /payments/verify-payment - Verify payment signature
router.post("/verify-payment", (req, res) => paymentsController.verifyPayment(req, res));

// GET /payments/:id - Get payment details
router.get("/:id", (req, res) => paymentsController.getPayment(req, res));

export default router;
