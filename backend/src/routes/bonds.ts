import { Router } from "express"
import { prisma } from "../lib/db"

const router = Router()

function clean(body: any): { error: string } | { data: { name: string; principal: number; ratePct: number; startDate: Date; maturityDate: Date } } {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : ""
  const principal = Number(body.principal)
  const ratePct = Number(body.ratePct)
  const startDate = new Date(body.startDate)
  const maturityDate = new Date(body.maturityDate)
  if (!name) return { error: "Give the bond a name." }
  if (!(principal > 0)) return { error: "Enter the amount you paid." }
  if (!(ratePct >= 0 && ratePct <= 100)) return { error: "The yearly interest rate must be between 0 and 100." }
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(maturityDate.getTime())) return { error: "Pick a start date and a maturity date." }
  if (maturityDate <= startDate) return { error: "The maturity date must be after the start date." }
  return { data: { name, principal, ratePct, startDate, maturityDate } }
}

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    res.json(await prisma.bond.findMany({ where: { userId, deletedAt: null }, orderBy: { maturityDate: "asc" } }))
  } catch {
    res.status(500).json({ error: "Failed to fetch bonds" })
  }
})

router.post("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const parsed = clean(req.body)
    if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return }
    res.status(201).json(await prisma.bond.create({ data: { ...parsed.data, userId } }))
  } catch {
    res.status(500).json({ error: "Failed to add bond" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const parsed = clean(req.body)
    if ("error" in parsed) { res.status(400).json({ error: parsed.error }); return }
    const { count } = await prisma.bond.updateMany({ where: { id: Number(req.params.id), userId, deletedAt: null }, data: parsed.data })
    if (count === 0) { res.status(404).json({ error: "Bond not found" }); return }
    res.json(await prisma.bond.findUnique({ where: { id: Number(req.params.id) } }))
  } catch {
    res.status(500).json({ error: "Failed to update bond" })
  }
})

router.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const { count } = await prisma.bond.updateMany({ where: { id: Number(req.params.id), userId, deletedAt: null }, data: { deletedAt: new Date() } })
    if (count === 0) { res.status(404).json({ error: "Bond not found" }); return }
    res.status(204).send()
  } catch {
    res.status(500).json({ error: "Failed to delete bond" })
  }
})

export default router
