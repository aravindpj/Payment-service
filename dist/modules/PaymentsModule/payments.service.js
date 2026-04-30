"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsService = exports.PaymentsService = void 0;
const payments_repository_1 = require("./payments.repository");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const config_env_1 = require("../../config/config.env");
const logger_1 = __importDefault(require("../../common/logger/logger"));
const razorpay = new razorpay_1.default({
    key_id: config_env_1.env.RAZORPAY_KEY_ID || "rzp_test_dummy",
    key_secret: config_env_1.env.RAZORPAY_KEY_SECRET || "dummy_secret",
});
class PaymentsService {
    /**
     * Create a Razorpay order
     */
    async createRazorpayOrder(amount, currency, userId, idempotencyKey) {
        logger_1.default.info("Creating Razorpay order", { amount, currency, idempotencyKey });
        const finalIdempotencyKey = idempotencyKey || crypto_1.default.randomUUID();
        const payment = await payments_repository_1.paymentsRepository.createOrder({
            amount,
            currency,
            idempotencyKey: finalIdempotencyKey,
            user_id: userId
        });
        const options = {
            amount: amount * 100, // amount in the smallest currency unit (paise for INR)
            currency,
            receipt: `receipt_${Date.now()}`,
        };
        try {
            // In a real scenario, we'd pass idempotencyKey to Razorpay headers if supported by SDK or via direct API
            // For dummy purpose, we just log it
            const order = await razorpay.orders.create(options);
            return order;
        }
        catch (error) {
            logger_1.default.error("Razorpay Order Creation Error", { error: error.message });
            throw new Error("Failed to create Razorpay order");
        }
    }
    /**
     * Verify Razorpay signature
     */
    verifySignature(orderId, paymentId, signature) {
        logger_1.default.info("Verifying Razorpay signature", { orderId, paymentId });
        const body = orderId + "|" + paymentId;
        const expectedSignature = crypto_1.default
            .createHmac("sha256", config_env_1.env.RAZORPAY_KEY_SECRET || "dummy_secret")
            .update(body.toString())
            .digest("hex");
        const isVerified = expectedSignature === signature;
        logger_1.default.info("Signature verification result", { isVerified });
        return isVerified;
    }
    /**
     * Get payment details by ID
     */
    async getPaymentById(id) {
        return payments_repository_1.paymentsRepository.findById(id);
    }
    /**
     * Update payment status (e.g., from webhook)
     */
    async updatePaymentStatus(id, status) {
        logger_1.default.info("Updating payment status", { paymentId: id, status });
        return payments_repository_1.paymentsRepository.updateStatus(id, status);
    }
}
exports.PaymentsService = PaymentsService;
exports.paymentsService = new PaymentsService();
