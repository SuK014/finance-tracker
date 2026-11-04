import { NextFunction, Request, Response, Router } from "express"
import multer from "multer"
import rateLimit from "express-rate-limit"
import { randomBytes } from "crypto"
import { prisma } from "../lib/db"
import { dedupeKeyFor, hashInboxKey, parseSlipText, resolveWhen, slipMoment } from "../lib/slipText"
import { parseWhen, thaiParts } from "../lib/tz"

// The iPhone Shortcut reads a bank-app screenshot with Apple's OCR and drops the text (and a small copy of the
// image) here. Slips wait in PendingSlip, outside every total, until they are confirmed in the app.

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000

// ---- Intake: authenticated by the inbox key, not a login ----

export const intakeRouter = Router()

const intakeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many slips at once. Try again in a minute." },
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true)
    else cb(new Error("Only image files are allowed"))
  },
})

async function requireInboxKey(req: Request, res: Response, next: NextFunction) {
  const key = req.header("x-inbox-key")
  if (!key) {
    res.status(401).json({ error: "Missing inbox key" })
    return
  }
  try {
    const user = await prisma.user.findUnique({ where: { inboxKeyHash: hashInboxKey(key) }, select: { id: true } })
    if (!user) {
      res.status(401).json({ error: "Invalid inbox key" })
      return
    }
    ;(req as any).inboxUserId = user.id
    next()
  } catch {
    res.status(500).json({ error: "Could not check the inbox key" })
  }
}

// Parses after the response has gone out, so a slow or failed parse can never lose a slip.
async function parseAndSave(id: number, text: string, takenAt: Date | null) {
  try {
    const fields = text
      ? await parseSlipText(text, thaiParts(new Date()).day)
      : { amount: null, type: null, day: null, time: null, description: null, source: "rules" as const }
    const when = resolveWhen(fields, takenAt)
    await prisma.pendingSlip.update({
      where: { id },
      data: {
        amount: fields.amount,
        type: fields.type,
        description: fields.description,
        day: when.day,
        time: when.time,
        timeSource: when.timeSource,
        parsedBy: fields.source,
      },
    })
  } catch (err) {
    console.error(`[inbox] could not parse slip ${id}:`, err)
    await prisma.pendingSlip.update({ where: { id }, data: { parsedBy: "none" } }).catch(() => undefined)
  }
}

// POST /api/inbox/intake — multipart: text (the OCR text), taken (when the screenshot was taken, optional), image (optional)
intakeRouter.post("/", intakeLimiter, requireInboxKey, upload.single("image"), async (req, res) => {
  const userId = (req as any).inboxUserId as number
  const text = typeof req.body?.text === "string" ? req.body.text.trim().slice(0, 5000) : ""
  const file = req.file
  if (!text && !file) {
    res.status(400).json({ error: "Send the OCR text, the image, or both" })
    return
  }
  const takenRaw = typeof req.body?.taken === "string" ? req.body.taken.trim() : ""
  const taken = takenRaw ? parseWhen(takenRaw) : null
  const takenAt = taken && !Number.isNaN(taken.getTime()) ? taken : null

  let id: number
  try {
    const slip = await prisma.pendingSlip.create({
      data: {
        userId,
        rawText: text,
        dedupeKey: dedupeKeyFor(text, file?.buffer ?? null),
        image: file ? new Uint8Array(file.buffer) : null,
        imageType: file?.mimetype ?? null,
        takenAt,
      },
      select: { id: true },
    })
    id = slip.id
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      res.json({ status: "duplicate" })
      return
    }
    console.error("[inbox] could not save slip:", err)
    res.status(500).json({ error: "Could not save the slip" })
    return
  }
  res.status(201).json({ status: "received", id })
  void parseAndSave(id, text, takenAt)
})

// Wrong file type or too large: say so as JSON, the Shortcut shows it.
intakeRouter.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(400).json({ error: err.message })
})

// ---- Review: the logged-in app ----

export const inboxRouter = Router()

type PendingRow = {
  id: number
  amount: number | null
  type: string | null
  day: string | null
  time: string | null
}

// A transaction with the same amount and type close to the slip's time (same day when the slip has no time):
// shown as a warning on the review screen, never blocks anything.
async function findDuplicate(userId: number, slip: PendingRow) {
  if (slip.amount == null || !slip.type || !slip.day) return null
  const moment = slipMoment(slip.day, slip.time)
  const range = moment
    ? { gte: new Date(moment.getTime() - DUPLICATE_WINDOW_MS), lte: new Date(moment.getTime() + DUPLICATE_WINDOW_MS) }
    : { gte: parseWhen(`${slip.day}T00:00`), lt: new Date(parseWhen(`${slip.day}T00:00`).getTime() + 24 * 60 * 60 * 1000) }
  return prisma.transaction.findFirst({
    where: { userId, deletedAt: null, type: slip.type, amount: slip.amount, date: range },
    select: { id: true, amount: true, description: true, date: true },
  })
}

// GET /api/inbox — slips waiting for you, oldest first
inboxRouter.get("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const slips = await prisma.pendingSlip.findMany({
      where: { userId, status: "pending" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, rawText: true, amount: true, type: true, description: true, day: true, time: true,
        timeSource: true, parsedBy: true, takenAt: true, createdAt: true, imageType: true,
      },
    })
    const withDuplicates = await Promise.all(
      slips.map(async ({ imageType, ...slip }) => ({
        ...slip,
        hasImage: imageType != null,
        duplicateOf: await findDuplicate(userId, slip),
      }))
    )
    res.json({ count: withDuplicates.length, slips: withDuplicates })
  } catch {
    res.status(500).json({ error: "Failed to load the inbox" })
  }
})

// Inbox key: shown once when it is made, only its hash is kept. Making a new one replaces the old one.
inboxRouter.get("/key", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: (req as any).user.userId }, select: { inboxKeyHash: true } })
    res.json({ hasKey: !!user?.inboxKeyHash })
  } catch {
    res.status(500).json({ error: "Failed to check the inbox key" })
  }
})

inboxRouter.post("/key", async (req, res) => {
  try {
    const key = `ngt_${randomBytes(24).toString("base64url")}`
    await prisma.user.update({ where: { id: (req as any).user.userId }, data: { inboxKeyHash: hashInboxKey(key) } })
    res.status(201).json({ key })
  } catch {
    res.status(500).json({ error: "Failed to make an inbox key" })
  }
})

inboxRouter.delete("/key", async (req, res) => {
  try {
    await prisma.user.update({ where: { id: (req as any).user.userId }, data: { inboxKeyHash: null } })
    res.status(204).end()
  } catch {
    res.status(500).json({ error: "Failed to remove the inbox key" })
  }
})

// GET /api/inbox/:id/image — the screenshot (needs the login header, so the app fetches it as a blob)
inboxRouter.get("/:id/image", async (req, res) => {
  try {
    const slip = await prisma.pendingSlip.findFirst({
      where: { id: Number(req.params.id), userId: (req as any).user.userId },
      select: { image: true, imageType: true },
    })
    if (!slip?.image) {
      res.status(404).json({ error: "No image for this slip" })
      return
    }
    res.type(slip.imageType ?? "image/jpeg").send(Buffer.from(slip.image))
  } catch {
    res.status(500).json({ error: "Failed to load the image" })
  }
})

// POST /api/inbox/:id/confirm — makes the real transaction from what you checked (edited or not)
inboxRouter.post("/:id/confirm", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const id = Number(req.params.id)
    const { amount, type, date, time, description, accountId, categoryId } = req.body ?? {}
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) { res.status(400).json({ error: "Enter an amount above zero" }); return }
    if (type !== "income" && type !== "expense") { res.status(400).json({ error: "Choose income or expense" }); return }
    if (typeof date !== "string" || !DAY_RE.test(date)) { res.status(400).json({ error: "Choose a date" }); return }
    if (time != null && time !== "" && (typeof time !== "string" || !TIME_RE.test(time))) { res.status(400).json({ error: "The time must look like 14:30" }); return }

    const account = await prisma.account.findFirst({ where: { id: Number(accountId), userId, deletedAt: null } })
    if (!account) { res.status(400).json({ error: "Invalid account" }); return }
    if (categoryId) {
      const category = await prisma.category.findFirst({ where: { id: Number(categoryId), userId, deletedAt: null } })
      if (!category) { res.status(400).json({ error: "Invalid category" }); return }
    }

    const note = typeof description === "string" && description.trim() ? description.trim().slice(0, 200) : null
    const transaction = await prisma.$transaction(async tx => {
      // Claim the slip first so two taps (or two devices) can only ever make one transaction
      const claimed = await tx.pendingSlip.updateMany({ where: { id, userId, status: "pending" }, data: { status: "confirmed", decidedAt: new Date() } })
      if (claimed.count === 0) return null
      const created = await tx.transaction.create({
        data: {
          amount, type, description: note, accountId: account.id,
          categoryId: categoryId ? Number(categoryId) : null,
          date: parseWhen(time ? `${date}T${time}` : date),
          userId,
        },
      })
      await tx.pendingSlip.update({ where: { id }, data: { transactionId: created.id } })
      return created
    })
    if (!transaction) { res.status(404).json({ error: "That slip was already handled" }); return }
    res.status(201).json(transaction)
  } catch (error) {
    console.error("[inbox] confirm failed:", error)
    res.status(500).json({ error: "Failed to confirm the slip" })
  }
})

// POST /api/inbox/:id/reject — keeps the row (so the same screenshot is not added again) but drops the image
inboxRouter.post("/:id/reject", async (req, res) => {
  try {
    const { count } = await prisma.pendingSlip.updateMany({
      where: { id: Number(req.params.id), userId: (req as any).user.userId, status: "pending" },
      data: { status: "rejected", decidedAt: new Date(), image: null, imageType: null },
    })
    if (count === 0) { res.status(404).json({ error: "That slip was already handled" }); return }
    res.status(204).end()
  } catch {
    res.status(500).json({ error: "Failed to reject the slip" })
  }
})
