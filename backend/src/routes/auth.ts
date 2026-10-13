import { Router } from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import rateLimit from "express-rate-limit"
import { prisma } from "../lib/db"
import { requireAuth } from "../middleware/auth"
import { JWT_SECRET } from "../lib/jwtSecret"

const router = Router()

// 10 attempts per 15 minutes per IP — enough for a real user to fumble their
// password a few times, not enough for a meaningful brute-force run.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
})

const MIN_PASSWORD_LENGTH = 8

router.post("/register", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" })
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
      return
    }
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: "Email already registered" })
      return
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, passwordHash } })
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" })
    res.status(201).json({ token, email: user.email })
  } catch (error) {
    res.status(500).json({ error: "Registration failed" })
  }
})

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" })
      return
    }
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" })
      return
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" })
    res.json({ token, email: user.email })
  } catch (error) {
    res.status(500).json({ error: "Login failed" })
  }
})

// Requires auth — change the logged-in user's password
router.put("/password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Both currentPassword and newPassword are required" })
      return
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` })
      return
    }
    const userId = (req as any).user.userId
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) { res.status(404).json({ error: "User not found" }); return }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return }
    const hash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: "Failed to change password" })
  }
})

export default router
