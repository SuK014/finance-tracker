// Picks which of your accounts a slip belongs to from the bank name the Shortcut sends ("kbank", "SCB", "กสิกร").
// The account's own "Bank name" can be spelled any way ("Kasikorn", "KBank Savings"): both sides are reduced to
// one code per bank first, so they meet in the middle.

// Short codes are matched as whole words (so "bay" never matches inside another word); longer names and Thai names
// are matched anywhere in the text once spaces and punctuation are removed.
const BANKS: Array<{ code: string; words: string[]; names: string[] }> = [
  { code: "kbank", words: ["kbank", "kbnk"], names: ["kasikorn", "กสิกร"] },
  { code: "scb", words: ["scb"], names: ["siamcommercial", "ไทยพาณิชย์", "ธนาคารไทยพาณิชย์"] },
  { code: "bbl", words: ["bbl"], names: ["bangkokbank", "กรุงเทพ"] },
  { code: "ktb", words: ["ktb"], names: ["krungthai", "กรุงไทย"] },
  { code: "bay", words: ["bay"], names: ["krungsri", "กรุงศรี", "bankofayudhya"] },
  { code: "ttb", words: ["ttb", "tmb"], names: ["tmbthanachart", "thanachart", "ทหารไทย", "ธนชาต"] },
  { code: "gsb", words: ["gsb"], names: ["governmentsavings", "ออมสิน"] },
  { code: "baac", words: ["baac"], names: ["ธ.ก.ส", "ธกส", "bankforagriculture"] },
  { code: "ghb", words: ["ghb"], names: ["governmenthousing", "อาคารสงเคราะห์"] },
  { code: "uob", words: ["uob"], names: ["unitedoverseas"] },
  { code: "cimb", words: ["cimb"], names: ["cimbthai"] },
  { code: "lhb", words: ["lhb", "lhbank"], names: ["landandhouses", "แลนด์แอนด์เฮ้าส์"] },
  { code: "kkp", words: ["kkp"], names: ["kiatnakin", "เกียรตินาคิน"] },
  { code: "tisco", words: ["tisco"], names: ["ทิสโก้"] },
  { code: "icbc", words: ["icbc"], names: ["ไอซีบีซี"] },
  { code: "promptpay", words: [], names: ["promptpay", "พร้อมเพย์"] },
]

const squash = (text: string) => text.toLowerCase().replace(/[\s.\-_()/]+/g, "")
const wordsOf = (text: string) => text.toLowerCase().split(/[^a-z0-9฀-๿]+/).filter(Boolean)

// One code per bank, or null for a bank we don't know.
export function bankCode(text: string | null | undefined): string | null {
  if (!text) return null
  const flat = squash(text)
  const words = wordsOf(text)
  for (const bank of BANKS) {
    if (bank.words.some(w => words.includes(w))) return bank.code
    if (bank.names.some(n => flat.includes(squash(n)))) return bank.code
  }
  return null
}

type AccountLike = { id: number; name: string; bankName: string | null }

// The account to start on, only when exactly one account fits: two accounts at the same bank can't be told apart,
// so no guess is made and the review screen falls back to the account you used last.
export function matchAccount(bank: string | null | undefined, accounts: AccountLike[]): number | null {
  if (!bank || !bank.trim()) return null
  const wanted = bankCode(bank)
  const plain = squash(bank)
  const hits = accounts.filter(a => {
    const code = bankCode(a.bankName) ?? bankCode(a.name)
    if (wanted && code) return code === wanted
    // A bank we don't know: fall back to the same text on the account's bank name or name
    return [a.bankName, a.name].some(t => t && squash(t) === plain)
  })
  return hits.length === 1 ? hits[0].id : null
}
