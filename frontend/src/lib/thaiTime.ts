// Dates are real moments shown in Thai time (UTC+7).
export const THAI_TZ = "Asia/Bangkok"

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000

// A Date whose UTC fields read as the Thai wall clock for the given moment (default: now). Use the getUTC*
// methods on the result to get the Thai day, month, hour, etc.
export const thaiClock = (when: Date | string | number = Date.now()) => new Date(new Date(when).getTime() + THAI_OFFSET_MS)

// The real moment at which today (Thai time) began.
export const startOfThaiToday = () => new Date(thaiClock().setUTCHours(0, 0, 0, 0) - THAI_OFFSET_MS)
