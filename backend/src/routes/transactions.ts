import { Router } from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { prisma } from "../lib/db"

const uploadsDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

// Extension is derived from the verified mimetype, never from the
// client-supplied original filename — an attacker can name a file
// "evidence.html" regardless of its declared Content-Type.
const EXT_BY_MIMETYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = EXT_BY_MIMETYPE[file.mimetype] ?? ""
    // Random, unguessable name — evidence images are served publicly by
    // filename with no auth check, so the name itself is the only barrier
    // against enumeration.
    cb(null, `txn-${crypto.randomBytes(24).toString("hex")}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype in EXT_BY_MIMETYPE) cb(null, true)
    else cb(new Error("Only image files are allowed"))
  },
})

const router = Router();

router.get("/", async (req, res) => {
    try {
        const userId = (req as any).user.userId
        const { accountId, month } = req.query
        let dateFilter = {}
        if (month && typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
            const [y, m] = month.split("-").map(Number)
            dateFilter = { date: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } }
        }
        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                deletedAt: null,
                ...(accountId ? { accountId: Number(accountId) } : {}),
                ...dateFilter,
            },
            include: { account: true, category: true },
            orderBy: { date: "desc" },
        })
        res.json(transactions)
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch transactions" })
    }
})

router.post("/", async (req, res) => {
    try {
        const userId = (req as any).user.userId
        const { amount, type, date, description, accountId, categoryId } = req.body
        // The account (and category, if given) must belong to this user —
        // otherwise a transaction could be linked into someone else's data.
        const account = await prisma.account.findFirst({ where: { id: Number(accountId), userId } })
        if (!account) { res.status(400).json({ error: "Invalid account" }); return }
        if (categoryId) {
            const category = await prisma.category.findFirst({ where: { id: Number(categoryId), userId } })
            if (!category) { res.status(400).json({ error: "Invalid category" }); return }
        }
        const transaction = await prisma.transaction.create({
            data: { amount, type, date: new Date(date), description, accountId: Number(accountId), categoryId: categoryId ? Number(categoryId) : null, userId },
        })
        res.status(201).json(transaction)
    } catch (error) {
        res.status(500).json({ error: "Failed to create transaction" })
    }
})

router.put("/:id", async (req, res) => {
    try {
        const userId = (req as any).user.userId
        const { amount, type, date, description, accountId, categoryId } = req.body
        const account = await prisma.account.findFirst({ where: { id: Number(accountId), userId } })
        if (!account) { res.status(400).json({ error: "Invalid account" }); return }
        if (categoryId) {
            const category = await prisma.category.findFirst({ where: { id: Number(categoryId), userId } })
            if (!category) { res.status(400).json({ error: "Invalid category" }); return }
        }
        const { count } = await prisma.transaction.updateMany({
            where: { id: Number(req.params.id), userId },
            data: {
                amount: Number(amount),
                type,
                date: new Date(date),
                description,
                accountId: Number(accountId),
                categoryId: categoryId ? Number(categoryId) : null,
            },
        })
        if (count === 0) { res.status(404).json({ error: "Transaction not found" }); return }
        const transaction = await prisma.transaction.findUnique({ where: { id: Number(req.params.id) } })
        res.json(transaction)
    } catch (error) {
        res.status(500).json({ error: "Failed to update transaction" })
    }
})

router.post("/:id/evidence", upload.single("image"), async (req, res) => {
  try {
    const userId = (req as any).user.userId
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return }
    const { count } = await prisma.transaction.updateMany({
      where: { id: Number(req.params.id), userId },
      data: { evidenceUrl: `/uploads/${req.file.filename}` },
    })
    if (count === 0) { res.status(404).json({ error: "Transaction not found" }); return }
    const transaction = await prisma.transaction.findUnique({ where: { id: Number(req.params.id) } })
    res.json(transaction)
  } catch (error) {
    res.status(500).json({ error: "Failed to upload evidence" })
  }
})

router.delete("/:id", async (req, res) => {
    try {
        const userId = (req as any).user.userId
        const { count } = await prisma.transaction.updateMany({
            where: { id: Number(req.params.id), userId },
            data: { deletedAt: new Date() },
        })
        if (count === 0) { res.status(404).json({ error: "Transaction not found" }); return }
        res.status(204).send()
    } catch (error) {
        res.status(500).json({ error: "Failed to delete transaction" })
    }
})

export default router
