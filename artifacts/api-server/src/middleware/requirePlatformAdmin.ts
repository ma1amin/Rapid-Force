import type { Request, Response, NextFunction } from "express";

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.isPlatformAdmin) {
    res.status(401).json({ error: "Platform admin access required" });
    return;
  }
  next();
}
