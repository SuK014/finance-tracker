type IconSource = { icon?: string | null; name?: string | null; type?: string | null }

// Name hints so categories created before icons existed still get a sensible emoji.
const HINTS: Array<[RegExp, string]> = [
  [/coffee|cafe|café/i, "☕"],
  [/food|eat|meal|lunch|dinner|restaurant|dining/i, "🍜"],
  [/grocer|market|supermarket/i, "🛒"],
  [/transport|bts|mrt|taxi|grab|bus|fuel|gas|petrol|car/i, "🚌"],
  [/rent|house|home|mortgage|condo/i, "🏠"],
  [/bill|utilit|electric|water|internet|phone/i, "💡"],
  [/health|medic|doctor|pharm|gym|fitness/i, "💊"],
  [/shop|cloth|fashion/i, "🛍️"],
  [/travel|trip|flight|hotel|holiday/i, "✈️"],
  [/entertain|movie|game|fun|netflix|subscript/i, "🎬"],
  [/educat|course|school|book/i, "📚"],
  [/gift|donat|charity/i, "🎁"],
  [/salary|wage|payroll|income/i, "💰"],
  [/freelance|bonus|side/i, "💼"],
  [/invest|dividend|stock|interest/i, "📈"],
  [/save|saving/i, "🐷"],
]

export function categoryEmoji(cat: IconSource | null | undefined): string {
  if (!cat) return "🏷️"
  if (cat.icon) return cat.icon
  const name = cat.name ?? ""
  for (const [re, emoji] of HINTS) if (re.test(name)) return emoji
  return cat.type === "income" ? "💰" : "🏷️"
}

export const EMOJI_CHOICES = [
  "🍜", "☕", "🛒", "🚌", "🏠", "💡", "💊", "🛍️",
  "✈️", "🎬", "📚", "🎁", "💰", "💼", "📈", "🐷",
  "🍺", "🍰", "🚗", "⛽", "📱", "🎮", "👶", "🐶",
  "💇", "🏋️", "🧾", "🔧", "🎓", "❤️", "🌴", "🏷️",
]
