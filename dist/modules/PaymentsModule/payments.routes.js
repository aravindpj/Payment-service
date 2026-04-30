"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payments_controller_1 = require("./payments.controller");
const router = (0, express_1.Router)();
// POST /payments/create-order - Create a new Razorpay order
router.post("/create-order", (req, res) => payments_controller_1.paymentsController.createOrder(req, res));
// POST /payments/verify-payment - Verify payment signature
router.post("/verify-payment", (req, res) => payments_controller_1.paymentsController.verifyPayment(req, res));
// GET /payments/:id - Get payment details
router.get("/:id", (req, res) => payments_controller_1.paymentsController.getPayment(req, res));
exports.default = router;
