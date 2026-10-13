import express from "express"
import cors from "cors"
import path from "path"
import accountsRouter from "./routes/accounts"
import transactionsRouter from "./routes/transactions"
import categoriesRouter from "./routes/categories"
import portfolioRouter from "./routes/portfolio"
import slipsRouter from "./routes/slips"
import recurringRouter from "./routes/recurring"
import reportsRouter from "./routes/reports"
import authRouter from "./routes/auth"
import { requireAuth } from "./middleware/auth"

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001

// Comma-separated list of allowed origins, e.g. "http://localhost:3000,https://finance-tracker.vercel.app"
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",").map(o => o.trim())

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))

app.get("/health", (_req, res) => {
    res.json({ status: "ok" })
})

// Public routes — no token needed
app.use("/api/auth", authRouter)

// All routes below this line require a valid JWT
app.use("/api", requireAuth)
app.use("/api/accounts", accountsRouter)
app.use("/api/transactions", transactionsRouter)
app.use("/api/categories", categoriesRouter)
app.use("/api/portfolio", portfolioRouter)
app.use("/api/slips", slipsRouter)
app.use("/api/recurring", recurringRouter)
app.use("/api/reports", reportsRouter)

app.listen(PORT,() => {
    console.log(`Server running on port ${PORT}`)
})