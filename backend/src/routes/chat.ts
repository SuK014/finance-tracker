import { Router } from "express"
import rateLimit from "express-rate-limit"

// Link to the Budget Buddy coach, a separate program that runs on this computer (`python dev.py serve` in the
// b-buddy repo). This route only checks the login and passes the question on: the user id comes from the verified
// token, never from the request body, so one user can never ask the coach about another user's money.
const router = Router()

const MAX_QUESTION_CHARS = 500
const ASK_TIMEOUT_MS = 240_000 // the local model can take a minute to load on a cold start
const HEALTH_TIMEOUT_MS = 4_000

const coachUrl = () => (process.env.COACH_URL ?? "http://127.0.0.1:8765").replace(/\/$/, "")

const askLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  // Always behind requireAuth, so every request has a user; limit per user, never by IP address.
  keyGenerator: req => `user:${(req as any).user.userId}`,
  message: { error: "too_many_requests" },
})

// GET /api/chat/health -> { ready: boolean, reason: string, warm: boolean }
router.get("/health", async (_req, res) => {
  if (!process.env.COACH_SHARED_SECRET) {
    res.json({ ready: false, reason: "not_configured", warm: false })
    return
  }
  try {
    const r = await fetch(`${coachUrl()}/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) })
    const body = (await r.json()) as { ready?: boolean; reason?: string; warm?: boolean }
    res.json({ ready: !!body.ready, reason: body.reason ?? "", warm: !!body.warm })
  } catch {
    res.json({ ready: false, reason: "coach_not_running", warm: false })
  }
})

// POST /api/chat { question } -> the coach's reply, or { error: "<code>" } with an HTTP error status
router.post("/", askLimiter, async (req, res) => {
  const secret = process.env.COACH_SHARED_SECRET
  if (!secret) {
    res.status(503).json({ error: "not_configured" })
    return
  }
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : ""
  if (!question || question.length > MAX_QUESTION_CHARS) {
    res.status(400).json({ error: "bad_question" })
    return
  }
  const userId = (req as any).user.userId as number
  try {
    const r = await fetch(`${coachUrl()}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Coach-Secret": secret },
      body: JSON.stringify({ userId, question }),
      signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
    })
    const body = (await r.json()) as Record<string, unknown>
    if (r.ok) {
      res.json(body)
      return
    }
    // Only the coach's short error code goes to the browser, whatever else it said.
    const code = typeof body.error === "string" ? body.error : "answer_failed"
    res.status(r.status === 404 ? 404 : 503).json({ error: code })
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError"
    res.status(timedOut ? 504 : 503).json({ error: timedOut ? "timeout" : "coach_not_running" })
  }
})

export default router
