"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bootstrap = Bootstrap;
// bootstrap function is server start function
const http_1 = __importDefault(require("http"));
const postgres_connections_1 = require("@/common/database/postgres.connections");
const config_env_1 = require("@/config/config.env");
const logger_1 = __importDefault(require("@/common/logger/logger"));
const redis_connections_1 = require("@/common/redis/redis.connections");
function trackConnections(server) {
    const connections = new Set();
    server.on("connection", (socket) => {
        connections.add(socket);
        socket.on("close", () => connections.delete(socket));
    });
    return () => {
        connections.forEach((socket) => socket.destroy());
        logger_1.default.info(`Force-closed ${connections.size} lingering connections`);
    };
}
async function gracefulShutdown({ server, reason, exitCode = 0, }) {
    logger_1.default.info("Graceful shutdown initiated", { reason, exitCode });
    /*
     *  step 1 : timer for close the server after 10 seconds
     *  if eventloop has still busy after 10s forced to close
     */
    const timer = setTimeout(() => {
        process.exit(1);
    }, config_env_1.env.SHUTDOWN_TIMEOUT_MS);
    // unref() allows the timer to be ignored if the eventloop is empty
    timer.unref();
    try {
        // close new HTTP connections
        await new Promise((resolve, reject) => {
            server.close((err) => (!err ? resolve() : reject(err)));
        });
        // close db connection
        await (0, postgres_connections_1.disconnectDatabase)();
        // close redis connection
        await redis_connections_1.redis.closeClient();
        // close job queue connection
        // clear timer && shutdown completely
        clearTimeout(timer);
        logger_1.default.info("Server shutdown completed", { exitCode });
        process.exit(exitCode);
    }
    catch (error) {
        process.exit(1);
    }
}
function registerConnectionsHandler(server, destroyConnections) {
    let isShuttingDown = false;
    async function handleSignals(signal) {
        if (isShuttingDown) {
            logger_1.default.warn("Force shutdown");
            destroyConnections();
            return;
        }
        isShuttingDown = true;
        logger_1.default.info(`received ${signal}, shutting down gracefully`);
        await gracefulShutdown({ server, reason: signal });
    }
    process.on("SIGTERM", () => handleSignals("SIGTERM"));
    process.on("SIGINT", () => handleSignals("SIGINT"));
    process.on("uncaughtException", async () => {
        destroyConnections();
        await gracefulShutdown({
            server,
            reason: "uncaughtException",
            exitCode: 1,
        });
    });
    process.on("unhandledRejection", async () => {
        destroyConnections();
        await gracefulShutdown({
            server,
            reason: "unhandledRejection",
            exitCode: 1,
        });
    });
}
async function Bootstrap(app, options) {
    const { port, host } = options;
    // step 1 : connect database and redis
    await (0, postgres_connections_1.connectDatabase)();
    await redis_connections_1.redis.getClient();
    // step 2 : create HTTP server
    const server = http_1.default.createServer(app);
    // step 3 : track connections
    const destroyConnections = trackConnections(server);
    // step 4 : register handler for graceful shutdown
    registerConnectionsHandler(server, destroyConnections);
    // step 5 : start server
    await new Promise((resolve, reject) => {
        server.listen(port, host, resolve);
        server.once("error", reject);
    });
    logger_1.default.info("Server ready", {
        url: `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`,
        pid: process.pid,
        nodeVersion: process.version,
    });
}
