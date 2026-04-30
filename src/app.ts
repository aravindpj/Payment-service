import express, { Express } from "express";
import { env } from "@/config/config.env";
import { databaseHealth } from "./common/database/postgres.connections";
import paymentsRouter from "./modules/PaymentsModule/payments.routes";
import cors from "cors";

export function createAPP(): Express {
  const app = express();

  app.use(cors());

  app.use(express.json());

  app.use(express.urlencoded({ extended: true }));

  app.get("/health", async (_req, res) => {
    // check db connection
    const dbOk = await databaseHealth();
    const httpStatus = dbOk ? 200 : 503;
    const status = dbOk ? "ok" : "degraded";
    return res.status(httpStatus).json({
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      env: env.NODE_ENV,
      checks: {
        database: dbOk ? "ok" : "unreachable",
      },
    });
  });

  // payments routes
  app.use("/api/v1/payments", paymentsRouter);


  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("Unhandled error", {
        error: err.message,
        stack: err.stack,
      });
      res.status(500).json({
        error: err.message,
      });
    },
  );
  return app;
}
