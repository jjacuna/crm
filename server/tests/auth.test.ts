import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import { authRoutes, initAuth } from "../src/auth/routes.js";
import { requireAuth } from "../src/auth/middleware.js";
import session from "express-session";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: "test-secret-that-is-long-enough-for-validation",
      resave: false,
      saveUninitialized: false,
    }),
  );
  app.use("/api/auth", authRoutes);
  app.get("/api/protected", requireAuth, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("Auth", () => {
  let app: express.Express;

  beforeAll(async () => {
    process.env.ADMIN_EMAIL = "test@test.com";
    process.env.ADMIN_PASSWORD = "testpassword123";
    await initAuth("testpassword123");
    app = createTestApp();
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/protected");
    expect(res.status).toBe(401);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@test.com", password: "testpassword123" });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("test@test.com");
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });
});
