import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./shared/lib/logger.js";
import { auditContext } from "./shared/middleware/auditContext.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.controller.js";
import { issuesRouter } from "./modules/issues/issues.controller.js";
import { departmentsRouter } from "./modules/departments/departments.controller.js";
import { workOrdersRouter } from "./modules/workOrders/workOrders.controller.js";
import { uploadsRouter } from "./modules/uploads/uploads.controller.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));
  app.use(auditContext);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRouter);
  app.use("/issues", issuesRouter);
  app.use("/departments", departmentsRouter);
  app.use("/work-orders", workOrdersRouter);
  app.use("/uploads", uploadsRouter);

  app.use(errorHandler);

  return app;
}
