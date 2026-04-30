"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAPP = createAPP;
const express_1 = __importDefault(require("express"));
const config_env_1 = require("@/config/config.env");
const postgres_connections_1 = require("./common/database/postgres.connections");
const payments_routes_1 = __importDefault(require("./modules/PaymentsModule/payments.routes"));
const cors_1 = __importDefault(require("cors"));
function createAPP() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    app.get("/health", async (_req, res) => {
        // check db connection
        const dbOk = await (0, postgres_connections_1.databaseHealth)();
        const httpStatus = dbOk ? 200 : 503;
        const status = dbOk ? "ok" : "degraded";
        return res.status(httpStatus).json({
            status,
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
            env: config_env_1.env.NODE_ENV,
            checks: {
                database: dbOk ? "ok" : "unreachable",
            },
        });
    });
    // payments routes
    app.use("/api/v1/payments", payments_routes_1.default);
    app.use((err, _req, res, _next) => {
        console.error("Unhandled error", {
            error: err.message,
            stack: err.stack,
        });
        res.status(500).json({
            error: err.message,
        });
    });
    return app;
}
