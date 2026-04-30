// src/config/razorpay.ts
import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay credentials not set");
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Exported for HMAC verification
export const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET;
export const RZP_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;
