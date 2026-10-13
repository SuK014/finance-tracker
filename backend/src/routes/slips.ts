import { Router } from "express"
import multer from "multer"
import { getVisionProvider } from "../lib/vision"

const router = Router()

// Keep files in memory as Buffer (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true)
    else cb(new Error("Only image files are allowed"))
  },
})

// POST /api/slips/extract — accepts multiple images, returns extracted data per slip
router.post("/extract", upload.array("images", 20), async (req, res) => {
  const files = req.files as Express.Multer.File[]
  if (!files || files.length === 0) {
    res.status(400).json({ error: "No images uploaded" })
    return
  }

  const provider = getVisionProvider()

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const base64 = file.buffer.toString("base64")
        const data = await provider.extractSlip(base64, file.mimetype)
        return { filename: file.originalname, success: true, data }
      } catch (err) {
        return { filename: file.originalname, success: false, error: String(err) }
      }
    })
  )

  res.json(results)
})

export default router
