"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    // Server
    NODE_ENV: process.env.NODE_ENV ||
        "development",
    PORT: Number(process.env.PORT) || 3000,
    HOST: process.env.HOST || "0.0.0.0",
    // Database
    DATABASE_URL: process.env.DATABASE_URL,
    DB_POOL_MIN: Number(process.env.DB_POOL_MIN) || 2,
    DB_POOL_MAX: Number(process.env.DB_POOL_MAX) || 10,
    // Razorpay
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    // Graceful shutdown
    SHUTDOWN_TIMEOUT_MS: Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10000,
    // Helpers
    get isProd() {
        return this.NODE_ENV === "production";
    },
    get isDev() {
        return this.NODE_ENV === "development";
    },
    get isTest() {
        return this.NODE_ENV === "test";
    },
};
