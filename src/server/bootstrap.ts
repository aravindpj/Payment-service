// bootstrap function is server start function
import http from "http";
import net from "net";
import { Express } from "express";
import { connectDatabase, disconnectDatabase } from "@/common/database/postgres.connections";
import { env } from "@/config/config.env";
import logger from "@/common/logger/logger";
import { redis } from "@/common/redis/redis.connections";

interface GracefulShutdownOptions {
  server: http.Server;
  reason: string;
  exitCode?: number;
}
interface BootstrapOptions {
  port: number;
  host: string;
}

function trackConnections(server: http.Server) {
  const connections = new Set<net.Socket>();
  server.on("connection", (socket: net.Socket) => {
    connections.add(socket);

    socket.on("close", () => connections.delete(socket));
  });

  return () => {
    connections.forEach((socket) => socket.destroy());
    logger.info(`Force-closed ${connections.size} lingering connections`);
  };
}

async function gracefulShutdown({
  server,
  reason,
  exitCode = 0,
}: GracefulShutdownOptions) {
  logger.info("Graceful shutdown initiated", { reason, exitCode });
  /*
   *  step 1 : timer for close the server after 10 seconds
   *  if eventloop has still busy after 10s forced to close
   */

  const timer = setTimeout(() => {
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  // unref() allows the timer to be ignored if the eventloop is empty
  timer.unref();

  try {
    // close new HTTP connections

    await new Promise<void>((resolve, reject) => {
      server.close((err) => (!err ? resolve() : reject(err)));
    });
    
    // close db connection
    await disconnectDatabase()
    // close redis connection
    await redis.closeClient()
    // close job queue connection

    // clear timer && shutdown completely
    clearTimeout(timer);
    logger.info("Server shutdown completed", { exitCode });

    process.exit(exitCode);
  } catch (error) {
    process.exit(1);
  }
}

function registerConnectionsHandler(
  server: http.Server,
  destroyConnections: () => void,
) {
  let isShuttingDown = false;
  async function handleSignals(signal: string) {
    if (isShuttingDown) {
      logger.warn("Force shutdown");
      destroyConnections();
      return;
    }

    isShuttingDown = true;

    logger.info(`received ${signal}, shutting down gracefully`);

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

export async function Bootstrap(app: Express, options: BootstrapOptions) {
  const { port, host } = options;

  // step 1 : connect database and redis

  await connectDatabase();
  await redis.getClient()

  // step 2 : create HTTP server
  const server = http.createServer(app);

  // step 3 : track connections
  const destroyConnections = trackConnections(server);

  // step 4 : register handler for graceful shutdown

  registerConnectionsHandler(server, destroyConnections);

  // step 5 : start server

  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, resolve);
    server.once("error", reject);
  });

  logger.info("Server ready", {
    url: `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`,
    pid: process.pid,
    nodeVersion: process.version,
  });
}
