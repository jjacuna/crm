import { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: string;
    email: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.email) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
