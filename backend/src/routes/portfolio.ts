import { Router } from "express"
import { prisma } from "../lib/db"
import YahooFinance from "yahoo-finance2"

const router = Router()
const yf = new YahooFinance()

// Live price lookup — must come before /:symbol routes
router.get("/price/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  const [quote, fx] = await Promise.all([
    yf.quote(symbol),
    yf.quote("USDTHB=X"),
  ])
  res.json({
    symbol,
    name: quote.shortName ?? quote.longName ?? symbol,
    price: quote.regularMarketPrice ?? 0,
    currency: quote.currency ?? "USD",
    usdthb: fx.regularMarketPrice ?? 35,
  })
})

// USD→THB rate, for showing a combined net worth in baht
router.get("/fx", async (_req, res) => {
  try {
    const fx = await yf.quote("USDTHB=X")
    res.json({ usdthb: fx.regularMarketPrice ?? null })
  } catch (err) {
    console.error("[portfolio] could not fetch USDTHB:", err)
    res.json({ usdthb: null })
  }
})

// All individual lots — for the transactions page
router.get("/lots", async (req, res) => {
  const userId = (req as any).user.userId
  const lots = await prisma.assetLot.findMany({
    where: { userId, deletedAt: null },
    include: { asset: true },
    orderBy: { date: "desc" },
  })
  res.json(lots)
})

// Holdings — aggregated per symbol with live prices
router.get("/", async (req, res) => {
  const userId = (req as any).user.userId
  const assets = await prisma.asset.findMany({
    where: { deletedAt: null, lots: { some: { userId, deletedAt: null } } },
    include: { lots: { where: { userId, deletedAt: null } } },
  })

  const holdings = await Promise.all(
    assets.map(async (asset) => {
      const buyLots = asset.lots.filter((l) => l.lotType === "buy")
      const sellLots = asset.lots.filter((l) => l.lotType === "sell")

      const totalShares =
        buyLots.reduce((sum, l) => sum + l.quantity, 0) -
        sellLots.reduce((sum, l) => sum + l.quantity, 0)

      const totalBuyQuantity = buyLots.reduce((sum, l) => sum + l.quantity, 0)
      const totalBuyValue = buyLots.reduce((sum, l) => sum + l.quantity * l.price, 0)
      const avgCost = totalBuyQuantity > 0 ? totalBuyValue / totalBuyQuantity : 0

      const quote = await yf.quote(asset.symbol)
      const currentPrice = quote.regularMarketPrice ?? 0
      const totalValue = currentPrice * totalShares
      const totalCost = avgCost * totalShares
      const gainLoss = totalValue - totalCost
      const gainLossPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

      return {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        type: asset.type,
        currency: quote.currency ?? "USD",
        totalShares,
        avgCost,
        currentPrice,
        totalValue,
        gainLoss,
        gainLossPct,
      }
    })
  )

  // Only return assets that still have shares
  res.json(holdings.filter((h) => h.totalShares > 0))
})

// Add a buy lot (creates the Asset if this is the first purchase of that symbol)
router.post("/", async (req, res) => {
  const userId = (req as any).user.userId
  const { symbol, name, type, quantity, price } = req.body

  if (Number(quantity) <= 0 || Number(price) <= 0) {
    res.status(400).json({ error: "Quantity and price must be greater than 0" })
    return
  }

  const quote = await yf.quote((symbol as string).toUpperCase())
  const currency = (quote as any).currency ?? "USD"

  const asset = await prisma.asset.upsert({
    where: { symbol: (symbol as string).toUpperCase() },
    update: {},
    create: {
      symbol: (symbol as string).toUpperCase(),
      name,
      type: type ?? "stock",
      currency,
    },
  })

  const lot = await prisma.assetLot.create({
    data: {
      assetId: asset.id,
      lotType: "buy",
      quantity: Number(quantity),
      price: Number(price),
      userId,
    },
  })

  res.status(201).json(lot)
})

// Add a sell lot
router.post("/sell", async (req, res) => {
  const userId = (req as any).user.userId
  const { symbol, quantity, price } = req.body

  const asset = await prisma.asset.findUnique({
    where: { symbol: (symbol as string).toUpperCase() },
  })

  if (!asset) {
    res.status(404).json({ error: "Asset not found" })
    return
  }

  const lot = await prisma.assetLot.create({
    data: {
      assetId: asset.id,
      lotType: "sell",
      quantity: Number(quantity),
      price: Number(price),
      userId,
    },
  })

  res.status(201).json(lot)
})

// Edit a lot
router.put("/lots/:id", async (req, res) => {
  const userId = (req as any).user.userId
  const { quantity, price, date } = req.body

  if (Number(quantity) <= 0 || Number(price) <= 0) {
    res.status(400).json({ error: "Quantity and price must be greater than 0" })
    return
  }

  const { count } = await prisma.assetLot.updateMany({
    where: { id: Number(req.params.id), userId },
    data: {
      quantity: Number(quantity),
      price: Number(price),
      ...(date ? { date: new Date(date) } : {}),
    },
  })
  if (count === 0) { res.status(404).json({ error: "Lot not found" }); return }
  const lot = await prisma.assetLot.findUnique({ where: { id: Number(req.params.id) } })
  res.json(lot)
})

// Soft delete a lot
router.delete("/lots/:id", async (req, res) => {
  const userId = (req as any).user.userId
  const { count } = await prisma.assetLot.updateMany({
    where: { id: Number(req.params.id), userId },
    data: { deletedAt: new Date() },
  })
  if (count === 0) { res.status(404).json({ error: "Lot not found" }); return }
  res.status(204).send()
})

export default router
