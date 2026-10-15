import { Router } from "express"
import { prisma } from "../lib/db"
import { cashAmount } from "../lib/investing"
import { getUsdThb } from "../lib/fx"

const router = Router()

// "THB" / "USD" when given, otherwise null (= the account's own currency).
function cleanCurrency(value: unknown): string | null {
  return value === "THB" || value === "USD" ? value : null
}

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const recurring = await prisma.recurringTransaction.findMany({
      where: { userId, active: true },
      include: { account: true, category: true },
      orderBy: { nextDate: "asc" },
    })
    res.json(recurring)
  } catch {
    res.status(500).json({ error: "Failed to fetch recurring transactions" })
  }
})

router.post("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const { amount, type, description, accountId, categoryId, frequency, nextDate } = req.body
    const account = await prisma.account.findFirst({ where: { id: Number(accountId), userId } })
    if (!account) { res.status(400).json({ error: "Invalid account" }); return }
    const r = await prisma.recurringTransaction.create({
      data: {
        amount: Number(amount),
        type,
        description,
        accountId: Number(accountId),
        categoryId: categoryId ? Number(categoryId) : null,
        frequency,
        currency: cleanCurrency(req.body.currency),
        nextDate: new Date(nextDate),
        userId,
      },
      include: { account: true, category: true },
    })
    res.status(201).json(r)
  } catch {
    res.status(500).json({ error: "Failed to create recurring transaction" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const { amount, type, description, accountId, categoryId, frequency, nextDate } = req.body
    const { count } = await prisma.recurringTransaction.updateMany({
      where: { id: Number(req.params.id), userId },
      data: {
        amount: Number(amount),
        type,
        description,
        accountId: Number(accountId),
        categoryId: categoryId ? Number(categoryId) : null,
        frequency,
        currency: cleanCurrency(req.body.currency),
        nextDate: new Date(nextDate),
      },
    })
    if (count === 0) { res.status(404).json({ error: "Recurring transaction not found" }); return }
    const r = await prisma.recurringTransaction.findUnique({
      where: { id: Number(req.params.id) },
      include: { account: true, category: true },
    })
    res.json(r)
  } catch {
    res.status(500).json({ error: "Failed to update recurring transaction" })
  }
})

router.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const { count } = await prisma.recurringTransaction.updateMany({
      where: { id: Number(req.params.id), userId },
      data: { active: false },
    })
    if (count === 0) { res.status(404).json({ error: "Recurring transaction not found" }); return }
    res.status(204).send()
  } catch {
    res.status(500).json({ error: "Failed to delete recurring transaction" })
  }
})

router.post("/:id/record", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const r = await prisma.recurringTransaction.findFirst({
      where: { id: Number(req.params.id), userId },
      include: { account: true },
    })
    if (!r) { res.status(404).json({ error: "Not found" }); return }

    // A price billed in another currency (e.g. USD) leaves the account in the account's own currency, at today's rate.
    const billed = r.currency ?? r.account.currency
    const amount = billed === r.account.currency
      ? r.amount
      : cashAmount(r.account.currency, billed, r.amount, await getUsdThb())
    if (amount === null) {
      res.status(502).json({ error: "Couldn't get today's exchange rate. Try again in a moment." })
      return
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        type: r.type,
        description: r.description,
        accountId: r.accountId,
        categoryId: r.categoryId,
        date: new Date(),
        userId,
      },
    })

    const next = new Date(r.nextDate)
    if (r.frequency === "daily")   next.setDate(next.getDate() + 1)
    if (r.frequency === "weekly")  next.setDate(next.getDate() + 7)
    if (r.frequency === "monthly") next.setMonth(next.getMonth() + 1)
    if (r.frequency === "yearly")  next.setFullYear(next.getFullYear() + 1)

    await prisma.recurringTransaction.update({
      where: { id: r.id },
      data: { nextDate: next },
    })

    res.json(transaction)
  } catch {
    res.status(500).json({ error: "Failed to record transaction" })
  }
})

// POST /api/recurring/:id/receive { amount?, allocations?: [{ goalId, amount }] }
// Payday: records a recurring income (the amount can differ from the usual one), moves the next date on,
// and sets money aside for goals in the account it landed in — all together, or not at all.
router.post("/:id/receive", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const r = await prisma.recurringTransaction.findFirst({
      where: { id: Number(req.params.id), userId, active: true, type: "income" },
    })
    if (!r) { res.status(404).json({ error: "Salary not found" }); return }

    const amount = req.body.amount === undefined ? r.amount : Number(req.body.amount)
    if (!(amount > 0) || !Number.isFinite(amount)) { res.status(400).json({ error: "Enter the amount you received." }); return }

    const raw: unknown[] = Array.isArray(req.body.allocations) ? req.body.allocations : []
    const allocations = raw
      .map((a: any) => ({ goalId: Number(a?.goalId), amount: Math.round(Number(a?.amount) * 100) / 100 }))
      .filter(a => a.amount > 0)
    const total = allocations.reduce((sum, a) => sum + a.amount, 0)
    if (total > amount + 0.005) {
      res.status(400).json({ error: "You can't set aside more than you received." })
      return
    }
    if (allocations.length > 0) {
      const goals = await prisma.goal.findMany({
        where: { userId, deletedAt: null, id: { in: allocations.map(a => a.goalId) } },
        select: { id: true },
      })
      if (goals.length !== new Set(allocations.map(a => a.goalId)).size) { res.status(400).json({ error: "One of those goals no longer exists." }); return }
    }

    const next = new Date(r.nextDate)
    if (r.frequency === "daily")   next.setDate(next.getDate() + 1)
    if (r.frequency === "weekly")  next.setDate(next.getDate() + 7)
    if (r.frequency === "monthly") next.setMonth(next.getMonth() + 1)
    if (r.frequency === "yearly")  next.setFullYear(next.getFullYear() + 1)

    const now = new Date()
    const transaction = await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: { amount, type: "income", description: r.description, accountId: r.accountId, categoryId: r.categoryId, date: now, userId },
      })
      await tx.recurringTransaction.update({ where: { id: r.id }, data: { nextDate: next } })
      for (const a of allocations) {
        await tx.goalEntry.create({
          data: { userId, goalId: a.goalId, accountId: r.accountId, amount: a.amount, kind: "deposit", date: now },
        })
      }
      return txn
    })
    res.status(201).json({ transaction, setAside: Math.round(total * 100) / 100 })
  } catch {
    res.status(500).json({ error: "Failed to record your salary" })
  }
})

export default router
