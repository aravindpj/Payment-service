"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const bootstrap_1 = require("@/server/bootstrap");
require("@/config/config.env");
//validate env
const app = (0, app_1.createAPP)();
(0, bootstrap_1.Bootstrap)(app, {
    host: "0.0.0.0",
    port: 3000,
}).catch((err) => {
    console.error("Failed to start server", err);
    process.exit(1);
});
