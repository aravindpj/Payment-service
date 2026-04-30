// 1 singleton connection

import { env } from "@/config/config.env";
import { Pool, PoolClient } from "pg";
import logger from "../logger/logger";

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    throw new Error(
      "Database pool not initiated. call connectDatabase() first",
    );
  }
  return pool;
}

// database connection

export async function connectDatabase() {
  // pool creation

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    min: env.DB_POOL_MIN,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const client: PoolClient = await pool.connect();
  // check health immediately and close
  try {
    await client.query("SELECT 1");
    logger.info("database connection established", {
      host: new URL(env.DATABASE_URL!).hostname,
      pool: { min: env.DB_POOL_MIN, max: env.DB_POOL_MAX },
    });
  } finally {
    client.release();
  }
}

// disconnect database

export async function disconnectDatabase() {
  if (!pool) return;
  await pool?.end();
  pool = null;
  logger.info("database connection closed");
}

// database health check

export async function databaseHealth() {
  if (!pool) return false;

  try {
    const p = getPool();
    const client = await p.connect();
    try {
      await client.query("SELECT 1");
      return true;
    } finally {
      client.release();
    }
  } catch {
    return false;
  }
}

/**
 * Production-ready query handler
 * - Handles pool connection acquisition and release
 * - Provides centralized error logging
 * - Supports parameterized queries for SQL injection prevention
 */
export const db = {
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const start = Date.now();
    const client = await getPool().connect();
    try {
      const res = await client.query(text, params);
      const duration = Date.now() - start;

      // Log slow queries (> 100ms) or trace queries in debug mode
      if (duration > 100) {
        logger.warn("Slow query detected", { text, duration, rows: res.rowCount });
      }

      return res.rows;
    } catch (error: any) {
      logger.error("Database query error", {
        text,
        params,
        error: error.message,
        stack: error.stack,
      });
      throw error; // Re-throw to be handled by service/controller
    } finally {
      client.release();
    }
  },

  /**
   * Transaction support helper
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Transaction failed, rolled back", { error });
      throw error;
    } finally {
      client.release();
    }
  },
};
