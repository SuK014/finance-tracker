import { Router } from "express"
import { prisma } from "../lib/db"

const router = Router()

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
    })
    if (!r) { res.status(404).json({ error: "Not found" }); return }

    const transaction = await prisma.transaction.create({
      data: {
        amount: r.amount,
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

    await prisma.recurringTransaction.update({
      where: { id: r.id },
      data: { nextDate: next },
    })

    res.json(transaction)
  } catch {
    res.status(500).json({ error: "Failed to record transaction" })
  }
})

export default router
