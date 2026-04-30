"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RZP_WEBHOOK_SECRET = exports.RZP_SECRET = exports.razorpay = void 0;
// src/config/razorpay.ts
const razorpay_1 = __importDefault(require("razorpay"));
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials not set");
}
exports.razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
// Exported for HMAC verification
exports.RZP_SECRET = process.env.RAZORPAY_KEY_SECRET;
exports.RZP_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
