export type VoiceCategory = { id: number; name: string; type?: string | null }

export type VoiceResult = {
  amount: number | null
  type: "income" | "expense"
  categoryId: number | null
  description: string
  date: string | null // YYYY-MM-DD, null = keep the sheet's current date
  source: "ai" | "rules"
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

const INCOME_RE = /\b(income|salary|paid me|received|got paid|refund|bonus)\b|เงินเดือน|รายรับ|ได้รับ|รับเงิน|โบนัส|ได้เงิน/i

// Simple offline parser: digits only (no Thai number words), category matched by name.
export function parseWithRules(text: string, categories: VoiceCategory[], today: string): VoiceResult {
  const amountMatch = text.replace(/,/g, "").match(/\d+(?:\.\d+)?/)
  const amount = amountMatch ? Number(amountMatch[0]) : null
  const type = INCOME_RE.test(text) ? "income" : "expense"

  let date: string | null = null
  if (/เมื่อวาน|yesterday/i.test(text)) date = shiftDay(today, -1)
  else if (/วันนี้|today/i.test(text)) date = today

  const lower = text.toLowerCase()
  const category = categories
    .filter(c => !c.type || c.type === type)
    .find(c => c.name.trim() && lower.includes(c.name.trim().toLowerCase()))

  const description = text
    .replace(/\d[\d,]*(?:\.\d+)?/g, " ")
    .replace(/บาท|baht|thb|฿|เมื่อวานนี้|เมื่อวาน|วันนี้|yesterday|today/gi, " ")
    .replace(/\s+/g, " ")
    .trim()

  return { amount, type, categoryId: category?.id ?? null, description, date, source: "rules" }
}

function buildPrompt(text: string, categories: VoiceCategory[], today: string): string {
  const list = categories.map(c => `${c.id}: ${c.name} (${c.type ?? "any"})`).join("\n")
  return `You turn a spoken note (Thai or English, possibly mis-transcribed) into one money transaction.
Today is ${today}. Return ONLY valid JSON:
{"amount": <number or null>, "type": "expense" or "income", "categoryId": <id from the list or null>, "description": "<short note, in the speaker's language>", "date": "<YYYY-MM-DD or null>"}
Rules:
- Understand Thai number words (e.g. สองร้อย = 200, พันห้า = 1500) and amounts in baht.
- type is "income" only when money is received (salary, refund, sold something); otherwise "expense".
- categoryId: pick a category from the list that clearly fits and matches the type; if unsure use null. Never invent ids.
- date: resolve relative words (yesterday/เมื่อวาน, last Friday...) from today; null if no day is mentioned.
- description: the item or place only (e.g. "coffee"), without the amount.

Categories:
${list || "(none)"}

Spoken note: """${text}"""`
}

async function parseWithGemini(text: string, categories: VoiceCategory[], today: string): Promise<VoiceResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set")
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash"
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(text, categories, today) }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
      signal: AbortSignal.timeout(15000),
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

  const amount = typeof p.amount === "number" && p.amount > 0 ? p.amount : null
  const type = p.type === "income" ? "income" : "expense"
  const cat = categories.find(c => c.id === p.categoryId && (!c.type || c.type === type))
  const date = typeof p.date === "string" && DAY_RE.test(p.date) ? p.date : null
  const description = typeof p.description === "string" ? p.description.trim().slice(0, 200) : ""
  return { amount, type, categoryId: cat?.id ?? null, description, date, source: "ai" }
}

// Gemini first (understands Thai number words and loose phrasing); if it is
// missing, rate-limited or offline, fall back to the simple offline rules.
export async function parseVoice(text: string, categories: VoiceCategory[], today: string): Promise<VoiceResult> {
  if (process.env.GEMINI_API_KEY) {
    try {
      return await parseWithGemini(text, categories, today)
    } catch (err) {
      console.error("[voice] Gemini parse failed, using rules:", err)
    }
  }
  return parseWithRules(text, categories, today)
}
