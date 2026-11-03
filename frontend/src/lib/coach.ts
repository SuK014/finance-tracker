// Client for the Budget Buddy coach. The browser only ever talks to this app's own backend (/api/chat), which checks
// the login and forwards the question to the coach running on the same computer.
import { authHeaders } from "@/lib/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL

// The chat button exists only when this build was made with NEXT_PUBLIC_COACH_ENABLED=true. Removing the variable
// (and rebuilding) removes the feature everywhere.
export const COACH_ENABLED = process.env.NEXT_PUBLIC_COACH_ENABLED === "true"

export type ReceiptRow = { tool: string; args: Record<string, unknown>; result: unknown }

// A button under a question the coach asked back: tapping it sends `question`, a complete question on its own.
export type CoachOption = { label: string; question: string }

export type CoachReply = {
  answer: string
  route: string
  answeredBy: "local" | "server" | "none"
  flags: string[]
  latencyS: number
  tip: { id?: string; title?: string; source?: string; url?: string } | null
  receipt: ReceiptRow[]
  options?: CoachOption[]
}

export type CoachHealth = { ready: boolean; reason: string }
export type UatMeta = { round: 1 | 2; tester_number: 1 | 2 | 3 | 4; task_id: string }

export class CoachError extends Error {
  constructor(public code: string) {
    super(code)
  }
}

export async function coachHealth(signal?: AbortSignal): Promise<CoachHealth> {
  try {
    const res = await fetch(`${API_URL}/api/chat/health`, { headers: authHeaders(), signal })
    if (!res.ok) return { ready: false, reason: "coach_not_running" }
    const body = await res.json()
    return { ready: !!body.ready, reason: String(body.reason ?? "") }
  } catch {
    return { ready: false, reason: "coach_not_running" }
  }
}

export async function askCoach(question: string, uat: UatMeta | null = null, signal?: AbortSignal): Promise<CoachReply> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ question, uat }),
      signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e
    throw new CoachError("coach_not_running")
  }
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    // fall through to the generic error below
  }
  if (!res.ok) {
    const code = (body as { error?: unknown } | null)?.error
    throw new CoachError(typeof code === "string" ? code : "answer_failed")
  }
  return body as CoachReply
}

// Plain-words messages for the short error codes the backend returns.
export function coachErrorMessage(code: string): string {
  switch (code) {
    case "model_missing":
      return "The local model isn't downloaded yet. Run python dev.py pull, then try again."
    case "database_unavailable":
    case "database_not_configured":
      return "Couldn't read your transactions. Check the coach's database connection."
    case "no_data":
      return "There are no transactions on this account yet."
    case "timeout":
      return "That took too long. Try a shorter question."
    case "busy":
      return "Buddy is answering other questions right now. Try again in a minute."
    case "model_error":
      return "Buddy couldn't reach its language model. Try again in a minute."
    case "too_many_requests":
      return "That's a lot of questions at once. Wait a moment, then try again."
    case "bad_question":
      return "Questions can be up to 500 characters."
    case "ollama_offline":
    case "coach_not_running":
    case "not_configured":
      return "The coach stopped running. Start it with python dev.py serve."
    default:
      return "Couldn't get an answer. Try again."
  }
}

export const OFFLINE_REASONS: Record<string, string> = {
  coach_not_running: "Coach isn't running.",
  not_configured: "Coach isn't set up yet.",
  ollama_offline: "The local model server (Ollama) isn't running.",
  model_missing: "The local model isn't downloaded.",
  database_not_configured: "The coach has no database connection yet.",
}

export const OFFLINE_FIX: Record<string, string> = {
  coach_not_running: "Start it with python dev.py serve",
  not_configured: "Set COACH_SHARED_SECRET in both .env files (python dev.py coach-secret)",
  ollama_offline: "Open the Ollama app or run ollama serve",
  model_missing: "Run python dev.py pull",
  database_not_configured: "Set COACH_DATABASE_URL in Harness/.env",
}

// ---------------------------------------------------------------- receipt ("How I got this")

const baht = (n: number) =>
  "฿" + n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })

export function monthLabel(ym: unknown): string {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym))
  if (!m) return String(ym)
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleString("en-US", {
    month: "short", year: "numeric", timeZone: "UTC",
  })
}

const titleCase = (s: unknown) => String(s).replace(/_/g, " ").replace(/^./, c => c.toUpperCase())

export function toolLabel(tool: string, args: Record<string, unknown>): string {
  const cat = args.category ? titleCase(args.category) : ""
  switch (tool) {
    case "sum_by_category": return `${cat}, ${monthLabel(args.month)}`
    case "compare_months": return `${cat}, ${monthLabel(args.m1)} to ${monthLabel(args.m2)}`
    case "get_budget": return `${cat} budget`
    case "over_budget": return `Categories over budget, ${monthLabel(args.month)}`
    case "month_summary": return `Month summary, ${monthLabel(args.month)}`
    case "get_transactions": return `${cat ? cat + " purchases" : "Purchases"}, ${monthLabel(args.month)}`
    case "lookup_guideline": return "Saving tip"
    default: return titleCase(tool)
  }
}

const SUMMARY_KEYS: Record<string, string> = {
  income_total: "Income", spending_total: "Spent", net_cashflow: "Left over", refunds_total: "Refunds",
  m1_total: "First month", m2_total: "Second month", diff: "Change", pct_change: "Change %",
}

// One or more "label, value" pairs describing a tool result in words a person would use.
export function resultPairs(result: unknown): Array<[string, string]> {
  if (typeof result === "number") return [["", baht(result)]]
  if (Array.isArray(result) || (result && typeof result === "object" && "shown" in result && "total" in result)) {
    const list = (Array.isArray(result) ? result : (result as { shown: unknown[] }).shown) as Array<Record<string, unknown>>
    const total = Array.isArray(result) ? list.length : Number((result as { total: number }).total)
    if (total === 0) return [["", "None"]]
    if (list.every(r => r && typeof r === "object" && "over_by" in r)) {
      return list.map(r => [titleCase(r.category), `${baht(Number(r.spent))} of ${baht(Number(r.limit))}`] as [string, string])
    }
    return [["", `${total} ${total === 1 ? "purchase" : "purchases"}`]]
  }
  if (result && typeof result === "object") {
    const rec = result as Record<string, unknown>
    const pairs = Object.entries(SUMMARY_KEYS)
      .filter(([k]) => typeof rec[k] === "number")
      .map(([k, label]) => [label, k === "pct_change" ? `${rec[k]}%` : baht(rec[k] as number)] as [string, string])
    if (pairs.length) return pairs
  }
  return [["", typeof result === "string" ? result : "Done"]]
}

export function whoAnswered(reply: Pick<CoachReply, "answeredBy" | "route" | "flags">): string {
  if (reply.answeredBy === "none") return "A fixed reply. No model wrote this."
  if (reply.answeredBy === "local") return "Numbers calculated by code. Worded by the local model."
  if (reply.route === "advice") return "Numbers calculated by code. Advice written by the larger model from totals only."
  return "Numbers calculated by code. Worded by the larger model after the local model struggled."
}

export const hasThai = (text: string) => /[฀-๿]/.test(text)

export const safeUrl = (url: unknown): string | null =>
  typeof url === "string" && /^https?:\/\//i.test(url) ? url : null
