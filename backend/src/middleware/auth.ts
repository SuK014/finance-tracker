import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../lib/jwtSecret"

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid token" })
    return
  }
  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; email: string }
    ;(req as any).user = payload
    next()
  } catch {
    res.status(401).json({ error: "Token expired or invalid" })
  }
}
