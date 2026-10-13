import { Router } from "express";
import { prisma } from "../lib/db";

const router = Router();

router.get("/", async (req, res) => {
    try {
        const userId = (req as any).user.userId
        const accounts = await prisma.account.findMany({
            where: { userId, deletedAt: null },
            include: {
                transactions: {
                    where: { deletedAt: null },
                    select: { amount: true, type: true },
                },
            },
        })
        const result = accounts.map(({ transactions, ...a }) => {
            const income  = transactions.filter(t => t.type === "income") .reduce((s, t) => s + t.amount, 0)
            const expense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
            return { ...a, balance: income - expense }
        })
        res.json(result)
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch accounts" })
    }
})

router.post("/", async (req, res) => {
    try {
        const userId = (req as any).user.userId
        const { name, type, bankName, currency } = req.body
        const account = await prisma.account.create({ data: { name, type, bankName, currency, userId } })
        res.status(201).json(account)
    } catch (error) {
        res.status(500).json({ error: "Failed to create account" })
    }
})

router.put("/:id", async (req, res) => {
    try {
        const userId = (req as any).user.userId
        const { name, type, bankName, currency } = req.body
        const { count } = await prisma.account.updateMany({
            where: { id: Number(req.params.id), userId },
            data: { name, type, bankName, currency },
        })
        if (count === 0) { res.status(404).json({ error: "Account not found" }); return }
        const account = await prisma.account.findUnique({ where: { id: Number(req.params.id) } })
        res.json(account)
    } catch (error) {
        res.status(500).json({ error: "Failed to update account" })
    }
})

// Soft delete: mark account + all its transactions as deleted atomically
router.delete("/:id", async (req, res) => {
    try {
        const userId = (req as any).user.userId
        const id = Number(req.params.id)
        const now = new Date()
        const owned = await prisma.account.findFirst({ where: { id, userId } })
        if (!owned) { res.status(404).json({ error: "Account not found" }); return }
        await prisma.$transaction([
            prisma.transaction.updateMany({
                where: { accountId: id, userId, deletedAt: null },
                data: { deletedAt: now },
            }),
            prisma.account.update({
                where: { id },
                data: { deletedAt: now },
            }),
        ])
        res.status(204).send()
    } catch (error) {
        res.status(500).json({ error: "Failed to delete account" })
    }
})

export default router
