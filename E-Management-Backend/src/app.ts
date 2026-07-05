import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { requestLogger } from "./middlewares/requestLogger.middleware";
import { apiRateLimiter } from "./middlewares/rateLimiter.middleware";
import { notFoundHandler } from "./middlewares/notFound.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { openApiDocument } from "./docs/openapi";
import routes from "./routes";

export function createApp() {
  const app = express();

  // Mounted before helmet() so Swagger UI's inline scripts/styles aren't
  // blocked by the strict CSP applied to the rest of the API.
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(requestLogger);
  app.use("/api", apiRateLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
