import { Router } from "express"
import { prisma } from "../lib/db"

const router = Router()

const round2 = (n: number) => Math.round(n * 100) / 100
const EPS = 0.005

type Entry = { goalId: number; accountId: number; amount: number }

// Sum of live entries, per goal and per account.
function totals(entries: Entry[]) {
  const perGoal = new Map<number, number>()
  const perGoalAccount = new Map<string, number>()
  for (const e of entries) {
    perGoal.set(e.goalId, (perGoal.get(e.goalId) ?? 0) + e.amount)
    const k = `${e.goalId}:${e.accountId}`
    perGoalAccount.set(k, (perGoalAccount.get(k) ?? 0) + e.amount)
  }
  return { perGoal, perGoalAccount }
}

async function accountBalance(userId: number, accountId: number): Promise<number | null> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId, deletedAt: null },
    include: { transactions: { where: { deletedAt: null }, select: { amount: true, type: true } } },
  })
  if (!account) return null
  return account.transactions.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0)
}

async function accountSetAside(userId: number, accountId: number): Promise<number> {
  const agg = await prisma.goalEntry.aggregate({
    where: { userId, accountId, deletedAt: null },
    _sum: { amount: true },
  })
  return agg._sum.amount ?? 0
}

function cleanGoal(body: any): { error: string } | { data: { name: string; icon: string | null; target: number; deadline: Date | null; ruleType: string | null; ruleValue: number | null } } {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : ""
  const target = Number(body.target)
  if (!name) return { error: "Give the goal a name." }
  if (!(target > 0)) return { error: "The target must be more than 0." }
  let deadline: Date | null = null
  if (body.deadline) {
    deadline = new Date(body.deadline)
    if (Number.isNaN(deadline.getTime())) return { error: "That deadline isn't a valid date." }
  }
  let ruleType: string | null = null
  let ruleValue: number | null = null
  if (body.ruleType) {
    if (body.ruleType !== "fixed" && body.ruleType !== "percent") return { error: "Unknown saving rule." }
    ruleType = body.ruleType
    ruleValue = Number(body.ruleValue)
    if (!(ruleValue > 0) || (ruleType === "percent" && ruleValue > 100)) return { error: "The saving rule amount isn't valid." }
  }
  return { data: { name, icon: typeof body.icon === "string" && body.icon ? body.icon.slice(0, 8) : null, target, deadline, ruleType, ruleValue } }
}

// GET /api/goals — every goal with how much is saved, and where it sits
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const goals = await prisma.goal.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "asc" } })
    const entries = await prisma.goalEntry.findMany({
      where: { userId, deletedAt: null, goalId: { in: goals.map(g => g.id) } },
      select: { goalId: true, accountId: true, amount: true },
    })
    const { perGoal, perGoalAccount } = totals(entries)
    res.json(
      goals.map(g => ({
        ...g,
        saved: round2(perGoal.get(g.id) ?? 0),
        accounts: [...perGoalAccount.entries()]
          .filter(([k, v]) => k.startsWith(`${g.id}:`) && v > EPS)
          .map(([k, v]) => ({ accountId: Number(k.split(":")[1]), amount: round2(v) })),
      })),
    )
  } catch {
    res.status(500).json({ error: "Failed to fetch goals" })
  }
})

router.post("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const parsed = cleanGoal(req.body)
    if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return }
    const goal = await prisma.goal.create({ data: { ...parsed.data, userId } })
    res.status(201).json({ ...goal, saved: 0, accounts: [] })
  } catch {
    res.status(500).json({ error: "Failed to create goal" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const parsed = cleanGoal(req.body)
    if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return }
    const { count } = await prisma.goal.updateMany({ where: { id: Number(req.params.id), userId, deletedAt: null }, data: parsed.data })
    if (count === 0) { res.status(404).json({ error: "Goal not found" }); return }
    res.json(await prisma.goal.findUnique({ where: { id: Number(req.params.id) } }))
  } catch {
    res.status(500).json({ error: "Failed to update goal" })
  }
})

// Deleting a goal releases its money: the entries go with it. Expenses already recorded from it stay.
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const id = Number(req.params.id)
    const goal = await prisma.goal.findFirst({ where: { id, userId, deletedAt: null } })
    if (!goal) { res.status(404).json({ error: "Goal not found" }); return }
    const now = new Date()
    await prisma.$transaction([
      prisma.goalEntry.updateMany({ where: { goalId: id, userId, deletedAt: null }, data: { deletedAt: now } }),
      prisma.goal.update({ where: { id }, data: { deletedAt: now } }),
    ])
    res.status(204).send()
  } catch {
    res.status(500).json({ error: "Failed to delete goal" })
  }
})

async function findGoal(req: any, res: any) {
  const userId = req.user.userId
  const goal = await prisma.goal.findFirst({ where: { id: Number(req.params.id), userId, deletedAt: null } })
  if (!goal) { res.status(404).json({ error: "Goal not found" }); return null }
  return goal
}

function positiveAmount(body: any): number | null {
  const n = Number(body.amount)
  return n > 0 && Number.isFinite(n) ? round2(n) : null
}

// POST /api/goals/:id/deposit { accountId, amount } — set money aside in an account
router.post("/:id/deposit", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const goal = await findGoal(req, res)
    if (!goal) return
    const amount = positiveAmount(req.body)
    if (amount === null) { res.status(400).json({ error: "Enter an amount above 0." }); return }
    const accountId = Number(req.body.accountId)
    const balance = await accountBalance(userId, accountId)
    if (balance === null) { res.status(400).json({ error: "Invalid account" }); return }
    const available = balance - (await accountSetAside(userId, accountId))
    if (amount > available + EPS) {
      res.status(400).json({ error: `Only ฿${Math.max(0, round2(available)).toLocaleString()} is available in that account.` })
      return
    }
    const entry = await prisma.goalEntry.create({ data: { userId, goalId: goal.id, accountId, amount, kind: "deposit" } })
    res.status(201).json(entry)
  } catch {
    res.status(500).json({ error: "Failed to set money aside" })
  }
})

// Money a goal holds in one account
async function heldIn(userId: number, goalId: number, accountId: number): Promise<number> {
  const agg = await prisma.goalEntry.aggregate({ where: { userId, goalId, accountId, deletedAt: null }, _sum: { amount: true } })
  return agg._sum.amount ?? 0
}

// POST /api/goals/:id/withdraw { accountId, amount } — take money back; the account balance is untouched
router.post("/:id/withdraw", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const goal = await findGoal(req, res)
    if (!goal) return
    const amount = positiveAmount(req.body)
    if (amount === null) { res.status(400).json({ error: "Enter an amount above 0." }); return }
    const accountId = Number(req.body.accountId)
    const held = await heldIn(userId, goal.id, accountId)
    if (amount > held + EPS) {
      res.status(400).json({ error: `This goal only holds ฿${Math.max(0, round2(held)).toLocaleString()} in that account.` })
      return
    }
    const entry = await prisma.goalEntry.create({ data: { userId, goalId: goal.id, accountId, amount: -amount, kind: "withdraw" } })
    res.status(201).json(entry)
  } catch {
    res.status(500).json({ error: "Failed to take money back" })
  }
})

// POST /api/goals/:id/spend { accountId, amount, categoryId?, description?, date? }
// Pays for something out of the goal: a real expense on the account, and the goal shrinks by the same amount.
router.post("/:id/spend", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const goal = await findGoal(req, res)
    if (!goal) return
    const amount = positiveAmount(req.body)
    if (amount === null) { res.status(400).json({ error: "Enter an amount above 0." }); return }
    const accountId = Number(req.body.accountId)
    const held = await heldIn(userId, goal.id, accountId)
    if (amount > held + EPS) {
      res.status(400).json({ error: `This goal only holds ฿${Math.max(0, round2(held)).toLocaleString()} in that account.` })
      return
    }
    let categoryId: number | null = null
    if (req.body.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: Number(req.body.categoryId), userId } })
      if (!category) { res.status(400).json({ error: "Invalid category" }); return }
      categoryId = category.id
    }
    const date = req.body.date ? new Date(req.body.date) : new Date()
    if (Number.isNaN(date.getTime())) { res.status(400).json({ error: "That date isn't valid." }); return }
    const description = typeof req.body.description === "string" && req.body.description.trim() ? req.body.description.trim().slice(0, 200) : goal.name

    const entry = await prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: { userId, accountId, categoryId, type: "expense", amount, description, date },
      })
      return tx.goalEntry.create({
        data: { userId, goalId: goal.id, accountId, amount: -amount, kind: "spend", transactionId: txn.id, date },
      })
    })
    res.status(201).json(entry)
  } catch {
    res.status(500).json({ error: "Failed to record the spending" })
  }
})

export default router
