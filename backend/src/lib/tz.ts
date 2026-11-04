// Dates are stored as real moments (timestamptz) and shown in Thai time (UTC+7). Everything typed in the app is Thai
// time, so a clock time without a zone is read as +07:00, and the API sends moments back as "...+07:00".
// Running the process in UTC keeps the server's own date maths independent of the machine it runs on.
process.env.TZ = "UTC"

const THAI_OFFSET = "+07:00"
const THAI_OFFSET_MS = 7 * 60 * 60 * 1000

// A date from a request body. "2026-10-26T14:52" means 14:52 in Thailand; a value with a zone ("...Z", "...+07:00")
// and a plain date ("2026-10-26", kept as midnight UTC) are taken as they are.
export function parseWhen(input: unknown): Date {
  const text = String(input)
  return /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(text) ? new Date(text + THAI_OFFSET) : new Date(text)
}

// Midnight at the start of a Thai calendar month (month is 1-12; 13 is January of the next year).
export function thaiMonthStart(year: number, month: number): Date {
  const y = year + Math.floor((month - 1) / 12)
  const m = ((month - 1) % 12) + 1
  return new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00${THAI_OFFSET}`)
}

// JSON replacer: Dates are serialised as "2026-10-26T07:52:00.000Z" before it runs; send them as
// "2026-10-26T14:52:00.000+07:00" instead (the same moment).
export function thaiJson(_key: string, value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return new Date(new Date(value).getTime() + THAI_OFFSET_MS).toISOString().replace("Z", THAI_OFFSET)
  }
  return value
}

// The Thai calendar day ("2026-10-26") and clock time ("14:52") of a moment.
export function thaiParts(moment: Date): { day: string; time: string } {
  const iso = new Date(moment.getTime() + THAI_OFFSET_MS).toISOString()
  return { day: iso.slice(0, 10), time: iso.slice(11, 16) }
}
