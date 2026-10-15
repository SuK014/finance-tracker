import { Router } from "express"
import { prisma } from "../lib/db"
import YahooFinance from "yahoo-finance2"
import { cashAmount, tradeDescription } from "../lib/investing"
import { getUsdThb } from "../lib/fx"

const router = Router()
const yf = new YahooFinance()

// Works out the account side of a trade: an error message, or the account and amount to move
// (account null when the trade isn't linked to an account).
async function linkedCash(
  userId: number,
  accountId: unknown,
  assetCurrency: string,
  quantity: number,
  price: number,
): Promise<{ error: string } | { account: { id: number; currency: string } | null; amount: number }> {
  if (accountId === undefined || accountId === null || accountId === "") return { account: null, amount: 0 }
  const account = await prisma.account.findFirst({ where: { id: Number(accountId), userId, deletedAt: null } })
  if (!account) return { error: "Invalid account" }
  const usdthb = account.currency === assetCurrency ? null : await getUsdThb()
  const amount = cashAmount(account.currency, assetCurrency, quantity * price, usdthb)
  if (amount === null) {
    return { error: `Couldn't convert ${assetCurrency} to ${account.currency}. Pick a THB or USD account, or choose not to link one.` }
  }
  return { account: { id: account.id, currency: account.currency }, amount }
}

async function sharesOwned(userId: number, assetId: number): Promise<number> {
  const lots = await prisma.assetLot.findMany({ where: { userId, assetId, deletedAt: null } })
  return lots.reduce((sum, l) => sum + (l.lotType === "buy" ? l.quantity : -l.quantity), 0)
}

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
  res.json({ usdthb: await getUsdThb() })
})

// All individual lots — for the transactions page
router.get("/lots", async (req, res) => {
  const userId = (req as any).user.userId
  const lots = await prisma.assetLot.findMany({
    where: { userId, deletedAt: null },
    include: { asset: true, account: { select: { name: true } } },
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

// Add a buy lot (creates the Asset if this is the first purchase of that symbol).
// With an accountId, the cost also leaves that account as an expense.
router.post("/", async (req, res) => {
  const userId = (req as any).user.userId
  const { symbol, name, type, quantity, price } = req.body

  if (Number(quantity) <= 0 || Number(price) <= 0) {
    res.status(400).json({ error: "Quantity and price must be greater than 0" })
    return
  }

  const quote = await yf.quote((symbol as string).toUpperCase())
  const currency = (quote as any).currency ?? "USD"

  const cash = await linkedCash(userId, req.body.accountId, currency, Number(quantity), Number(price))
  if ("error" in cash) { res.status(400).json({ error: cash.error }); return }

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

  const lot = await prisma.$transaction(async (tx) => {
    const created = await tx.assetLot.create({
      data: {
        assetId: asset.id, lotType: "buy", quantity: Number(quantity), price: Number(price), userId,
        accountId: cash.account?.id ?? null,
      },
    })
    if (!cash.account) return created
    // Money leaves the account: an expense, kept out of the spending totals.
    const txn = await tx.transaction.create({
      data: {
        userId, accountId: cash.account.id, type: "expense", amount: cash.amount, source: "investment",
        description: tradeDescription("buy", asset.symbol, Number(quantity)), date: created.date,
      },
    })
    return tx.assetLot.update({ where: { id: created.id }, data: { transactionId: txn.id } })
  })

  res.status(201).json(lot)
})

// Add a sell lot. With an accountId, the proceeds also arrive in that account as income.
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

  if (!(Number(quantity) > 0) || !(Number(price) > 0)) {
    res.status(400).json({ error: "Quantity and price must be greater than 0" })
    return
  }
  const owned = await sharesOwned(userId, asset.id)
  if (Number(quantity) > owned + 1e-9) {
    res.status(400).json({ error: `You only hold ${Number(owned.toFixed(6))} shares of ${asset.symbol}.` })
    return
  }

  const cash = await linkedCash(userId, req.body.accountId, asset.currency, Number(quantity), Number(price))
  if ("error" in cash) { res.status(400).json({ error: cash.error }); return }

  const lot = await prisma.$transaction(async (tx) => {
    const created = await tx.assetLot.create({
      data: {
        assetId: asset.id, lotType: "sell", quantity: Number(quantity), price: Number(price), userId,
        accountId: cash.account?.id ?? null,
      },
    })
    if (!cash.account) return created
    // Sale proceeds arrive in the account: income, kept out of the income totals.
    const txn = await tx.transaction.create({
      data: {
        userId, accountId: cash.account.id, type: "income", amount: cash.amount, source: "investment",
        description: tradeDescription("sell", asset.symbol, Number(quantity)), date: created.date,
      },
    })
    return tx.assetLot.update({ where: { id: created.id }, data: { transactionId: txn.id } })
  })

  res.status(201).json(lot)
})

// Edit a lot (and the account transaction it created, if any)
router.put("/lots/:id", async (req, res) => {
  const userId = (req as any).user.userId
  const { quantity, price, date } = req.body

  if (Number(quantity) <= 0 || Number(price) <= 0) {
    res.status(400).json({ error: "Quantity and price must be greater than 0" })
    return
  }

  const existing = await prisma.assetLot.findFirst({
    where: { id: Number(req.params.id), userId, deletedAt: null },
    include: { transaction: true },
  })
  if (!existing) { res.status(404).json({ error: "Lot not found" }); return }

  const lot = await prisma.$transaction(async (tx) => {
    const updated = await tx.assetLot.update({
      where: { id: existing.id },
      data: {
        quantity: Number(quantity),
        price: Number(price),
        ...(date ? { date: new Date(date) } : {}),
      },
    })
    // Keep the linked account transaction in step, at the exchange rate it was saved with.
    if (existing.transaction && !existing.transaction.deletedAt) {
      const oldValue = existing.quantity * existing.price
      const rate = oldValue > 0 ? existing.transaction.amount / oldValue : 1
      await tx.transaction.update({
        where: { id: existing.transaction.id },
        data: {
          amount: Math.round(Number(quantity) * Number(price) * rate * 100) / 100,
          date: updated.date,
          description: existing.transaction.description?.replace(/×[\d.]+$/, `×${Number(Number(quantity).toFixed(6))}`),
        },
      })
    }
    return updated
  })
  res.json(lot)
})

// Soft delete a lot. Its account transaction goes too, so the balance returns to what it was.
router.delete("/lots/:id", async (req, res) => {
  const userId = (req as any).user.userId
  const existing = await prisma.assetLot.findFirst({ where: { id: Number(req.params.id), userId, deletedAt: null } })
  if (!existing) { res.status(404).json({ error: "Lot not found" }); return }
  const now = new Date()
  await prisma.$transaction([
    prisma.assetLot.update({ where: { id: existing.id }, data: { deletedAt: now } }),
    ...(existing.transactionId
      ? [prisma.transaction.update({ where: { id: existing.transactionId }, data: { deletedAt: now } })]
      : []),
  ])
  res.status(204).send()
})

export default router
