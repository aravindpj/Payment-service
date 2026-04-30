"use strict";
// 1 singleton connection
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.databaseHealth = databaseHealth;
const config_env_1 = require("@/config/config.env");
const pg_1 = require("pg");
const logger_1 = __importDefault(require("../logger/logger"));
let pool = null;
function getPool() {
    if (!pool) {
        throw new Error("Database pool not initiated. call connectDatabase() first");
    }
    return pool;
}
// database connection
async function connectDatabase() {
    // pool creation
    pool = new pg_1.Pool({
        connectionString: config_env_1.env.DATABASE_URL,
        max: config_env_1.env.DB_POOL_MAX,
        min: config_env_1.env.DB_POOL_MIN,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: {
            rejectUnauthorized: false,
        },
    });
    const client = await pool.connect();
    // check health immediately and close
    try {
        await client.query("SELECT 1");
        logger_1.default.info("database connection established", {
            host: new URL(config_env_1.env.DATABASE_URL).hostname,
            pool: { min: config_env_1.env.DB_POOL_MIN, max: config_env_1.env.DB_POOL_MAX },
        });
    }
    finally {
        client.release();
    }
}
// disconnect database
async function disconnectDatabase() {
    if (!pool)
        return;
    await pool?.end();
    pool = null;
    logger_1.default.info("database connection closed");
}
// database health check
async function databaseHealth() {
    if (!pool)
        return false;
    try {
        const p = getPool();
        const client = await p.connect();
        try {
            await client.query("SELECT 1");
            return true;
        }
        finally {
            client.release();
        }
    }
    catch {
        return false;
    }
}
/**
 * Production-ready query handler
 * - Handles pool connection acquisition and release
 * - Provides centralized error logging
 * - Supports parameterized queries for SQL injection prevention
 */
exports.db = {
    async query(text, params) {
        const start = Date.now();
        const client = await getPool().connect();
        try {
            const res = await client.query(text, params);
            const duration = Date.now() - start;
            // Log slow queries (> 100ms) or trace queries in debug mode
            if (duration > 100) {
                logger_1.default.warn("Slow query detected", { text, duration, rows: res.rowCount });
            }
            return res.rows;
        }
        catch (error) {
            logger_1.default.error("Database query error", {
                text,
                params,
                error: error.message,
                stack: error.stack,
            });
            throw error; // Re-throw to be handled by service/controller
        }
        finally {
            client.release();
        }
    },
    /**
     * Transaction support helper
     */
    async transaction(callback) {
        const client = await getPool().connect();
        try {
            await client.query("BEGIN");
            const result = await callback(client);
            await client.query("COMMIT");
            return result;
        }
        catch (error) {
            await client.query("ROLLBACK");
            logger_1.default.error("Transaction failed, rolled back", { error });
            throw error;
        }
        finally {
            client.release();
        }
    },
};
