import { Router } from "express";
import bcrypt from "bcrypt";

const router = Router();

// In-memory hash generated at startup
let adminPasswordHash: string;

export async function initAuth(password: string) {
  adminPasswordHash = await bcrypt.hash(password, 12);
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  if (email !== adminEmail) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // For test env, compare directly; for prod, use bcrypt
  const valid = adminPasswordHash
    ? await bcrypt.compare(password, adminPasswordHash)
    : password === process.env.ADMIN_PASSWORD;

  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.userId = "admin";
  req.session.email = email;
  res.json({ email });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session?.email) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ email: req.session.email });
});

export { router as authRoutes };
