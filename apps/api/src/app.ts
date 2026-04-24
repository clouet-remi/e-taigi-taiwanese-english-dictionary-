import express from "express";
import cors from "cors";
import helmetModule from "helmet";
import { searchHandler } from "./routes/search.js";
import { getApiConfig, createCorsOptions, type ApiConfig } from "./config.js";
import { createRateLimitMiddleware } from "./security.js";
import { logAndHandleError } from "./utils/error-handler.js";

const helmet = helmetModule as unknown as () => express.RequestHandler;

export const createApp = (config: ApiConfig = getApiConfig()) => {
  const app = express();

  if (config.trustProxy) {
    app.set("trust proxy", config.trustProxy);
  }

  app.use(cors(createCorsOptions(config.corsOrigins)));
  app.use(helmet());
  app.use(
    createRateLimitMiddleware({
      enabled: config.rateLimitEnabled,
      windowMs: config.rateLimitWindowMs,
      maxRequests: config.rateLimitMaxRequests,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/search", searchHandler);

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logAndHandleError(res, error, "Unhandled API error");
    }
  );

  return app;
};
