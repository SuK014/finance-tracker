import { createHash } from "crypto"
import { parseWhen, thaiParts } from "./tz"

// Turns the text Apple's OCR read off a bank-app screenshot into a transaction. Gemini does the reading when a key
// is set; the rules below are the fallback and also fill anything Gemini left empty.

export type SlipFields = {
  amount: number | null
  type: "income" | "expense" | null
  day: string | null // "YYYY-MM-DD", Gregorian
  time: string | null // "HH:mm", only a time printed next to the date on the slip
  description: string | null
  source: "ai" | "rules"
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙"
const toAsciiDigits = (s: string) => s.replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))

// Index = month number. Each entry is every spelling seen on slips, with and without the dots.
const MONTHS: string[][] = [
  [],
  ["ม.ค.", "มค", "มกราคม", "jan", "january"],
  ["ก.พ.", "กพ", "กุมภาพันธ์", "feb", "february"],
  ["มี.ค.", "มีค", "มีนาคม", "mar", "march"],
  ["เม.ย.", "เมย", "เมษายน", "apr", "april"],
  ["พ.ค.", "พค", "พฤษภาคม", "may"],
  ["มิ.ย.", "มิย", "มิถุนายน", "jun", "june"],
  ["ก.ค.", "กค", "กรกฎาคม", "jul", "july"],
  ["ส.ค.", "สค", "สิงหาคม", "aug", "august"],
  ["ก.ย.", "กย", "กันยายน", "sep", "sept", "september"],
  ["ต.ค.", "ตค", "ตุลาคม", "oct", "october"],
  ["พ.ย.", "พย", "พฤศจิกายน", "nov", "november"],
  ["ธ.ค.", "ธค", "ธันวาคม", "dec", "december"],
]

const stripDots = (s: string) => s.toLowerCase().replace(/\./g, "")

function monthNumber(word: string): number | null {
  const w = stripDots(word)
  for (let m = 1; m <= 12; m++) if (MONTHS[m].some(name => stripDots(name) === w)) return m
  return null
}

// 2569 (Buddhist) -> 2026; 69 -> 2026; 26 -> 2026; 2026 stays.
export function gregorianYear(raw: number): number {
  if (raw >= 2400) return raw - 543
  if (raw >= 100) return raw
  return raw >= 50 ? raw + 2500 - 543 : raw + 2000
}

const pad = (n: number) => String(n).padStart(2, "0")

function validDay(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null
  const probe = new Date(Date.UTC(y, m - 1, d))
  if (probe.getUTCMonth() !== m - 1) return null
  return `${y}-${pad(m)}-${pad(d)}`
}

type Found = { index: number; end: number; day: string }

// The first date in the text: 26/10/2569, 26-10-26, 26 ต.ค. 69, 26 Oct 2026.
function findDate(text: string): Found | null {
  const numeric = /(?<!\d)(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?!\d)/.exec(text)
  const worded = /(?<!\d)(\d{1,2})\s*([^\s\d,:]{2,12}?\.?)\s*(\d{2,4})(?!\d)/.exec(text)
  let wordedDay: Found | null = null
  if (worded) {
    const m = monthNumber(worded[2])
    const day = m && validDay(gregorianYear(Number(worded[3])), m, Number(worded[1]))
    if (day) wordedDay = { index: worded.index, end: worded.index + worded[0].length, day }
  }
  let numericDay: Found | null = null
  if (numeric) {
    const day = validDay(gregorianYear(Number(numeric[3])), Number(numeric[2]), Number(numeric[1]))
    if (day) numericDay = { index: numeric.index, end: numeric.index + numeric[0].length, day }
  }
  if (numericDay && wordedDay) return numericDay.index <= wordedDay.index ? numericDay : wordedDay
  return numericDay ?? wordedDay
}

// A clock time on the date's own line or the line after it. A time anywhere else is usually the phone's status
// bar, which is when the screenshot was taken, not when the transfer happened, so it is deliberately ignored.
function findTimeNear(text: string, date: Found): string | null {
  const from = text.lastIndexOf("\n", date.index - 1) + 1
  const nextBreak = text.indexOf("\n", date.end)
  const lineAfterEnd = nextBreak === -1 ? text.length : text.indexOf("\n", nextBreak + 1)
  const to = lineAfterEnd === -1 ? text.length : lineAfterEnd
  const re = /(?<!\d)([01]?\d|2[0-3])\s*([:.])\s*([0-5]\d)(?:\s*[:.]\s*[0-5]\d)?(\s*(?:น\.?|am|pm))?/gi
  const window = text.slice(from, to)
  const candidates: Array<{ at: number; value: string }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(window))) {
    // 14.30 is only a time when it says น. (otherwise it is a price such as 14.30 baht)
    if (m[2] === "." && !/น/.test(m[4] ?? "")) continue
    let hour = Number(m[1])
    const suffix = (m[4] ?? "").trim().toLowerCase()
    if (suffix === "pm" && hour < 12) hour += 12
    if (suffix === "am" && hour === 12) hour = 0
    candidates.push({ at: from + m.index, value: `${pad(hour)}:${m[3]}` })
  }
  if (!candidates.length) return null
  // Closest to the date wins; on a tie the one after it (slips print "date time")
  const mid = (date.index + date.end) / 2
  candidates.sort((a, b) => Math.abs(a.at - mid) - Math.abs(b.at - mid) || b.at - a.at)
  return candidates[0].value
}

const NUMBER = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)`
const AMOUNT_LABEL = String.raw`(?:จำนวนเงิน|จำนวน|ยอดเงิน|ยอดชำระ|ยอดโอน|ยอดรวม|amount|total)`

function findAmount(text: string): number | null {
  const labelled = new RegExp(`${AMOUNT_LABEL}[^\\d\\n]{0,20}${NUMBER}`, "i").exec(text)
  const labelledValue = labelled ? Number(labelled[1].replace(/,/g, "")) : 0
  if (labelledValue > 0) return labelledValue
  const re = new RegExp(`${NUMBER}\\s*(?:บาท|thb|baht|฿)`, "gi")
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 18), m.index)
    if (/ค่าธรรมเนียม|fee/i.test(before)) continue
    const value = Number(m[1].replace(/,/g, ""))
    if (value > 0) return value
  }
  const prefixed = new RegExp(`฿\\s*${NUMBER}`).exec(text)
  const prefixedValue = prefixed ? Number(prefixed[1].replace(/,/g, "")) : 0
  return prefixedValue > 0 ? prefixedValue : null
}

const INCOME_RE = /รับเงิน|ได้รับ|รับโอน|เงินเข้า|received|deposit|incoming/i
const EXPENSE_RE = /โอนเงิน|โอนสำเร็จ|ชำระ|จ่ายเงิน|จ่าย|ถอน|ซื้อ|transfer|payment|paid|withdraw|purchase/i

const NAME_LABEL = /(?:ไปยัง|ถึง|ผู้รับ|ชื่อบัญชี|ร้านค้า|ชำระให้|to|pay to|merchant|receiver)\s*[:：]?\s*(.*)$/i

function findDescription(text: string): string | null {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  for (let i = 0; i < lines.length; i++) {
    const m = NAME_LABEL.exec(lines[i])
    if (!m || m.index > 0) continue
    const rest = m[1].trim() || lines[i + 1] || ""
    if (rest && !/^\d[\d,.]*$/.test(rest)) return rest.slice(0, 80)
  }
  return null
}

export function parseSlipWithRules(text: string): SlipFields {
  const t = toAsciiDigits(text)
  const date = findDate(t)
  const type = INCOME_RE.test(t) ? "income" : EXPENSE_RE.test(t) ? "expense" : null
  return {
    amount: findAmount(t),
    type,
    day: date?.day ?? null,
    time: date ? findTimeNear(t, date) : null,
    description: findDescription(t),
    source: "rules",
  }
}

function buildPrompt(text: string, today: string): string {
  return `You read the text that on-device OCR extracted from a screenshot of a Thai bank app (a transfer slip or a transaction detail).
Today is ${today}. Return ONLY valid JSON:
{"amount": <number or null>, "type": "expense" or "income" or null, "date": "<YYYY-MM-DD or null>", "time": "<HH:mm 24-hour or null>", "description": "<receiver, merchant or memo, or null>"}
Rules:
- amount: the transferred or paid amount as a plain number. Ignore fees, balances and account numbers.
- type: "expense" when money was sent or paid, "income" when money was received, null if unclear.
- date: Thai slips use Buddhist-era years (2569 = 2026, and 69 = 2026). Return the Gregorian date.
- time: ONLY the time printed next to the transaction date. The phone's status-bar clock (usually the first line of text, with signal and battery) is NOT the transaction time; if no time is printed next to the date, return null.
- description: the receiver's or merchant's name, or the memo on the slip.

OCR text: """${text}"""`
}

async function parseWithGemini(text: string, today: string): Promise<SlipFields> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set")
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(text, today) }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(20000),
    }
  )
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Gemini request failed (${res.status}): ${detail.slice(0, 200)}`)
  }
  const body = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const raw = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("") ?? ""
  const json = raw.match(/\{[\s\S]*\}/)?.[0]
  if (!json) throw new Error("No JSON in Gemini response")
  const p = JSON.parse(json) as Record<string, unknown>
  return {
    amount: typeof p.amount === "number" && p.amount > 0 ? p.amount : null,
    type: p.type === "income" || p.type === "expense" ? p.type : null,
    day: typeof p.date === "string" && DAY_RE.test(p.date) ? p.date : null,
    time: typeof p.time === "string" && TIME_RE.test(p.time) ? p.time : null,
    description: typeof p.description === "string" && p.description.trim() ? p.description.trim().slice(0, 80) : null,
    source: "ai",
  }
}

// Gemini first, the rules fill whatever it left empty. With no key, or when Gemini is busy, the rules alone.
export async function parseSlipText(text: string, today: string): Promise<SlipFields> {
  const rules = parseSlipWithRules(text)
  if (!process.env.GEMINI_API_KEY) return rules
  try {
    const ai = await parseWithGemini(text, today)
    return {
      amount: ai.amount ?? rules.amount,
      type: ai.type ?? rules.type,
      day: ai.day ?? rules.day,
      time: ai.time ?? (ai.day ? null : rules.time),
      description: ai.description ?? rules.description,
      source: "ai",
    }
  } catch (err) {
    console.error("[inbox] Gemini parse failed, using rules:", err)
    return rules
  }
}

// Day and time for the slip: the time on the slip, else the time the screenshot was taken, else none (you fill it in).
// The screenshot's clock only stands in when it is the same day as the slip, or the slip has no day of its own.
export function resolveWhen(
  fields: Pick<SlipFields, "day" | "time">,
  takenAt: Date | null
): { day: string | null; time: string | null; timeSource: "slip" | "screenshot" | null } {
  const taken = takenAt ? thaiParts(takenAt) : null
  const day = fields.day ?? taken?.day ?? null
  if (fields.time) return { day, time: fields.time, timeSource: "slip" }
  if (taken && day === taken.day) return { day, time: taken.time, timeSource: "screenshot" }
  return { day, time: null, timeSource: null }
}

// Used to tell whether a slip was already received. Whitespace is ignored so the same screenshot always matches;
// a text too short to tell slips apart is keyed on the image instead.
export function dedupeKeyFor(text: string, image: Buffer | null): string {
  const normal = text.replace(/\s+/g, " ").trim()
  const hash = createHash("sha256")
  if (normal.length >= 20 || !image) hash.update(normal)
  else hash.update(image)
  return hash.digest("hex")
}

export function hashInboxKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

// The moment a slip happened, for matching it against existing transactions; null without a day and time.
export function slipMoment(day: string | null, time: string | null): Date | null {
  return day && time ? parseWhen(`${day}T${time}`) : null
}
