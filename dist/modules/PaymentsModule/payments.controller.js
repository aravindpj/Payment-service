"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsController = exports.PaymentsController = void 0;
const payments_service_1 = require("./payments.service");
const logger_1 = __importDefault(require("../../common/logger/logger"));
const crypto_1 = __importDefault(require("crypto"));
class PaymentsController {
    /**
     * Handle payment creation (Razorpay Order)
     */
    async createOrder(req, res) {
        try {
            const { amount, currency } = req.body;
            const idempotencyKey = req.headers["x-razorpay-idempotency-key"];
            const userId = crypto_1.default.randomUUID();
            if (!amount || !currency) {
                return res.status(400).json({ error: "Missing required fields: amount or currency" });
            }
            const order = await payments_service_1.paymentsService.createRazorpayOrder(amount, currency, userId, idempotencyKey);
            return res.status(201).json(order);
        }
        catch (error) {
            logger_1.default.error("Controller Error: createOrder", { error: error.message });
            return res.status(500).json({ error: error.message || "Internal server error" });
        }
    }
    /**
     * Handle payment verification
     */
    async verifyPayment(req, res) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({ error: "Missing verification fields" });
            }
            const isVerified = payments_service_1.paymentsService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
            if (isVerified) {
                return res.status(200).json({ status: "success", message: "Payment verified successfully" });
            }
            else {
                return res.status(400).json({ status: "failure", message: "Invalid signature" });
            }
        }
        catch (error) {
            logger_1.default.error("Controller Error: verifyPayment", { error: error.message });
            return res.status(500).json({ error: "Internal server error" });
        }
    }
    /**
     * Handle fetching payment details
     */
    async getPayment(req, res) {
        try {
            const { id } = req.params;
            const payment = await payments_service_1.paymentsService.getPaymentById(id);
            if (!payment) {
                return res.status(404).json({ error: "Payment not found" });
            }
            return res.status(200).json(payment);
        }
        catch (error) {
            logger_1.default.error("Controller Error: getPayment", { error: error.message });
            return res.status(500).json({ error: "Internal server error" });
        }
    }
}
exports.PaymentsController = PaymentsController;
exports.paymentsController = new PaymentsController();
