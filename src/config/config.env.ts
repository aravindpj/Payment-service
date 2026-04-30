import dotenv from "dotenv";

dotenv.config();

export const env = {
  // Server
  NODE_ENV:
    (process.env.NODE_ENV as "development" | "production" | "test") ||
    "development",
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || "0.0.0.0",

  // Database
  DATABASE_URL: process.env.DATABASE_URL as string,
  DB_POOL_MIN: Number(process.env.DB_POOL_MIN) || 2,
  DB_POOL_MAX: Number(process.env.DB_POOL_MAX) || 10,


  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID as string,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET as string,

  // Graceful shutdown
  SHUTDOWN_TIMEOUT_MS: Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10_000,

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

export type Env = typeof env;
