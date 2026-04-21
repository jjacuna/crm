import express from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { Redis } from "ioredis";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { authRoutes, initAuth } from "./auth/routes.js";
import { requireAuth } from "./auth/middleware.js";
import { contactRoutes } from "./contacts/routes.js";
import { workshopRoutes } from "./workshops/routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const app = express();
  const port = process.env.PORT ?? 3000;

  // Redis for sessions
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

  // Init admin password hash
  await initAuth(process.env.ADMIN_PASSWORD ?? "");

  // Middleware
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "development"
          ? "http://localhost:5173"
          : false,
      credentials: true,
    }),
  );

  // Raw body for Stripe webhooks (must be before express.json)
  app.use("/api/webhooks", express.raw({ type: "application/json" }));
  app.use(express.json());

  app.use(
    session({
      store: new RedisStore({ client: redis }),
      secret:
        process.env.SESSION_SECRET ?? "dev-secret-change-me-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: "lax",
      },
    }),
  );

  // Auth routes (no auth required)
  app.use("/api/auth", authRoutes);

  // Protected API routes
  app.use("/api/contacts", requireAuth, contactRoutes);
  app.use("/api/workshops", requireAuth, workshopRoutes);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Global error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    },
  );

  // Serve React SPA in production
  if (process.env.NODE_ENV === "production") {
    const clientDist = path.join(__dirname, "../../client/dist");
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.listen(port, () => {
    console.log(`Dr. AI CRM server running on port ${port}`);
  });
}

main().catch(console.error);
