"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const redis_1 = require("redis");
const logger_1 = __importDefault(require("../logger/logger"));
let client;
async function initializeRedisClient() {
    if (client)
        return client;
    // missing: redis retry connection
    client = (0, redis_1.createClient)();
    client.on("error", (err) => {
        logger_1.default.error("Redis not connected", {
            error: err,
        });
    });
    client.on("connection", () => {
        logger_1.default.info("Redis conncted successfully");
    });
    return client.connect();
}
async function closeRedisConnection() {
    if (client) {
        try {
            await client.quit();
            logger_1.default.warn("Redis quit connection");
        }
        catch (error) {
            client.destroy();
            logger_1.default.warn("Redis connection forcefully quit");
        }
        finally {
            client = null;
        }
    }
}
exports.redis = {
    getClient: initializeRedisClient,
    closeClient: closeRedisConnection,
};
