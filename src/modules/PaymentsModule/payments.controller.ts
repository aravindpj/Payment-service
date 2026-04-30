import { Request, Response } from "express";
import { paymentsService } from "./payments.service";
import logger from "../../common/logger/logger";
import crypto from "crypto";

export class PaymentsController {
  /**
   * Handle payment creation (Razorpay Order)
   */
  async createOrder(req: Request, res: Response) {
    try {
      const { amount, currency } = req.body;
      const idempotencyKey = req.idempotencyKey
      const userId = crypto.randomUUID()
      if (!amount || !currency) {
        return res.status(400).json({ error: "Missing required fields: amount or currency" });
      }

      const order = await paymentsService.createRazorpayOrder(amount, currency, userId, idempotencyKey);
      return res.status(201).json(order);
    } catch (error: any) {
      logger.error("Controller Error: createOrder", { error: error.message });
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  /**
   * Handle payment verification
   */
  async verifyPayment(req: Request, res: Response) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: "Missing verification fields" });
      }

      const isVerified = paymentsService.verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (isVerified) {
        return res.status(200).json({ status: "success", message: "Payment verified successfully" });
      } else {
        return res.status(400).json({ status: "failure", message: "Invalid signature" });
      }
    } catch (error: any) {
      logger.error("Controller Error: verifyPayment", { error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Handle fetching payment details
   */
  async getPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payment = await paymentsService.getPaymentById(id as string);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      return res.status(200).json(payment);
    } catch (error: any) {
      logger.error("Controller Error: getPayment", { error: error.message });
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const paymentsController = new PaymentsController();
