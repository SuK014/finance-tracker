import { Router } from "express"
import { prisma } from "../lib/db"

const router = Router()

// GET /api/reports/monthly?year=2026
router.get("/monthly", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const year = Number(req.query.year) || new Date().getFullYear()
    const months = await Promise.all(
      Array.from({ length: 12 }, async (_, i) => {
        const m = i + 1
        const start = new Date(year, i, 1)
        const end = new Date(year, i + 1, 1)
        const txns = await prisma.transaction.findMany({
          where: { userId, deletedAt: null, date: { gte: start, lt: end } },
          select: { amount: true, type: true },
        })
        const income  = txns.filter(t => t.type === "income") .reduce((s, t) => s + t.amount, 0)
        const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
        return { month: m, year, income, expense, net: income - expense }
      })
    )
    res.json(months)
  } catch {
    res.status(500).json({ error: "Failed to fetch report" })
  }
})

export default router
