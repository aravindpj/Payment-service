import { paymentsRepository, Payment } from "./payments.repository";
import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "../../config/config.env";
import logger from "../../common/logger/logger";

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "rzp_test_dummy",
  key_secret: env.RAZORPAY_KEY_SECRET || "dummy_secret",
});

export class PaymentsService {
  /**
   * Create a Razorpay order
   */
  async createRazorpayOrder(amount: number, currency: string, userId: string, idempotencyKey: string) {
    logger.info("Creating Razorpay order", { amount, currency, idempotencyKey });
   try {
    const payment = await paymentsRepository.createOrder({
      amount,
      currency,
      idempotencyKey,
      user_id: userId
    });


      if(payment.razorpayOrderId ){
        return payment
      }


      const options = {
        amount: amount * 100, 
        currency,
        receipt: `receipt_${Date.now()}`,
      };


      const razorpayOrder = await razorpay.orders.create(options);
       
      const finalPaymentResult=await paymentsRepository.updatePaymentRazorpayOrderId(razorpayOrder.id,payment.orderId)

      return finalPaymentResult;
    } catch (error: any) {
      logger.error("Razorpay Order Creation Error", { error: error.message });
      throw new Error("Failed to create Razorpay order");
    }
  }

  /**
   * Verify Razorpay signature
   */
  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    logger.info("Verifying Razorpay signature", { orderId, paymentId });

    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET || "dummy_secret")
      .update(body.toString())
      .digest("hex");

    const isVerified = expectedSignature === signature;
    logger.info("Signature verification result", { isVerified });
    return isVerified;
  }

  /**
   * Get payment details by ID
   */
  async getPaymentById(id: string): Promise<Payment | null> {
    return paymentsRepository.findById(id);
  }

  /**
   * Update payment status (e.g., from webhook)
   */
  async updatePaymentStatus(id: string, status: string): Promise<Payment | null> {
    logger.info("Updating payment status", { paymentId: id, status });
    return paymentsRepository.updateStatus(id, status);
  }
}

export const paymentsService = new PaymentsService();
