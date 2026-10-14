import { Router } from "express"
import { parseVoice, type VoiceCategory } from "../lib/voice/parse"

const router = Router()

// POST /api/voice/parse — { text, today?: "YYYY-MM-DD", categories: [{id,name,type}] }
// Turns a spoken/typed sentence into amount, type, category, note and date.
router.post("/parse", async (req, res) => {
  const { text, today, categories } = req.body ?? {}
  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "Say or type what you spent first." })
    return
  }
  const day = typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : new Date().toISOString().slice(0, 10)
  const cats: VoiceCategory[] = Array.isArray(categories)
    ? categories
        .filter((c: any) => c && Number.isInteger(c.id) && typeof c.name === "string")
        .slice(0, 100)
        .map((c: any) => ({ id: c.id, name: c.name.slice(0, 60), type: typeof c.type === "string" ? c.type : null }))
    : []
  res.json(await parseVoice(text.trim().slice(0, 500), cats, day))
})

export default router
