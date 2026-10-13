import { Router } from "express"
import { prisma } from "../lib/db"

const router = Router()

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const categories = await prisma.category.findMany({
      where: { userId, deletedAt: null },
    })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" })
  }
})

router.post("/", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const { name, color, type } = req.body
    const category = await prisma.category.create({
      data: { name, color, type: type ?? "expense", userId },
    })
    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ error: "Failed to create category" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const { name, color, type, budget } = req.body
    const { count } = await prisma.category.updateMany({
      where: { id: Number(req.params.id), userId },
      data: { name, color, ...(type ? { type } : {}), budget: budget != null ? Number(budget) : null },
    })
    if (count === 0) { res.status(404).json({ error: "Category not found" }); return }
    const category = await prisma.category.findUnique({ where: { id: Number(req.params.id) } })
    res.json(category)
  } catch (error) {
    res.status(500).json({ error: "Failed to update category" })
  }
})

router.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.userId
    const { count } = await prisma.category.updateMany({
      where: { id: Number(req.params.id), userId },
      data: { deletedAt: new Date() },
    })
    if (count === 0) { res.status(404).json({ error: "Category not found" }); return }
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: "Failed to delete category" })
  }
})

export default router
