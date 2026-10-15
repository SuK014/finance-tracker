// Minimal fake backend used only by Playwright E2E tests.
// Never touches the real database — /api/* routes return fixture data (or
// empty arrays where no fixture is defined) regardless of auth, so pages
// render real content without a live backend.
import { createServer } from "node:http"

const port = process.env.MOCK_API_PORT || 3055

const account = { id: 1, name: "Kasikorn", type: "bank", bankName: "Kasikorn", currency: "THB", balance: 1000, setAside: 400, available: 600 }
const category = { id: 1, name: "Groceries", color: "#3b62e0", type: "expense" }
const transaction = {
  id: 1, amount: 84.2, type: "expense", date: "2026-09-12T00:00:00.000Z",
  description: "Whole Foods", accountId: 1, categoryId: 1, evidenceUrl: null,
  account: { name: account.name }, category: { name: category.name, color: category.color },
}

// Categories are mutable in-memory state (not a static fixture) so a
// category created via POST actually shows up in a later GET — needed to
// test the quick-add-category flow's auto-select + refresh behavior.
const categories = [category]
let nextCategoryId = 100

const subscriptions = [
  { id: 1, amount: 419, type: "expense", description: "Netflix Premium", frequency: "monthly", nextDate: "2026-12-05T00:00:00.000Z", active: true, accountId: 1, categoryId: null, account: { name: account.name }, category: null },
  { id: 2, amount: 1200, type: "expense", description: "Disney+", frequency: "yearly", nextDate: "2027-03-01T00:00:00.000Z", active: true, accountId: 1, categoryId: null, account: { name: account.name }, category: null },
  { id: 3, amount: 300, type: "expense", description: "Gym", frequency: "monthly", nextDate: "2026-12-10T00:00:00.000Z", active: true, accountId: 1, categoryId: null, account: { name: account.name }, category: null },
]

// Only a user signed in with this token has a salary set up; everyone else sees the "Set up your salary" state.
const salary = { id: 9, amount: 30000, type: "income", description: "Salary", frequency: "monthly", nextDate: "2026-12-25T00:00:00.000Z", active: true, accountId: 1, categoryId: null, account: { name: account.name }, category: null }

const goals = [
  { id: 1, name: "Japan trip", icon: "🏝", target: 1000, deadline: "2027-12-31T00:00:00.000Z", ruleType: "fixed", ruleValue: 300, saved: 400, accounts: [{ accountId: 1, amount: 400 }] },
  { id: 2, name: "Emergency fund", icon: "🛟", target: 5000, deadline: null, ruleType: "percent", ruleValue: 10, saved: 0, accounts: [] },
]

// A subscription billed in dollars (account is in baht); only the user with this token has it.
const dollarSub = { id: 11, amount: 20, type: "expense", description: "Claude", frequency: "monthly", nextDate: "2026-12-07T00:00:00.000Z", active: true, accountId: 1, categoryId: null, currency: "USD", account: { name: account.name, currency: "THB" }, category: null }

// A matured bond keeps its value fixed, so tests do not depend on today's date:
// 10,000 at 2.5% for 366 days (2020) = 10,250.68.
const bonds = [
  { id: 1, name: "Savings bond 2020", principal: 10000, ratePct: 2.5, startDate: "2020-01-01T00:00:00.000Z", maturityDate: "2021-01-01T00:00:00.000Z", currency: "THB" },
]

const FIXTURES = {
  "/api/bonds": bonds,
  "/api/goals": goals,
  "/api/recurring": subscriptions,
  "/api/accounts": [account],
  "/api/transactions": [transaction],
  "/api/portfolio": [
    { id: 1, symbol: "APP", name: "Applovin Corporation", type: "stock", currency: "USD", totalShares: 2, avgCost: 250, currentPrice: 260, totalValue: 520, gainLoss: 20, gainLossPct: 4 },
  ],
  "/api/portfolio/fx": { usdthb: 30 },
}

const server = createServer((req, res) => {
  // Real client-side fetches (not just the server-side ones in serverApi.ts)
  // hit this mock directly from the browser, so it needs real CORS headers
  // — without them the browser silently blocks the request.
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  res.setHeader("Content-Type", "application/json")
  const path = (req.url ?? "").split("?")[0]

  if (path === "/api/recurring" && req.method === "GET" && req.headers.authorization === "Bearer test-salary-token") {
    res.writeHead(200)
    res.end(JSON.stringify([...subscriptions, salary]))
    return
  }

  if (path === "/api/recurring" && req.method === "GET" && req.headers.authorization === "Bearer test-usd-token") {
    res.writeHead(200)
    res.end(JSON.stringify([...subscriptions, dollarSub]))
    return
  }

  if (/^\/api\/recurring\/\d+\/receive$/.test(path) && req.method === "POST") {
    let body = ""
    req.on("data", chunk => { body += chunk })
    req.on("end", () => {
      res.writeHead(201)
      res.end(JSON.stringify({ transaction: { id: 70 }, ...JSON.parse(body || "{}") }))
    })
    return
  }

  if (path === "/api/categories") {
    if (req.method === "POST") {
      let body = ""
      req.on("data", chunk => { body += chunk })
      req.on("end", () => {
        const parsed = JSON.parse(body || "{}")
        const created = { id: nextCategoryId++, name: parsed.name, color: parsed.color, icon: parsed.icon ?? null, type: parsed.type ?? "expense" }
        categories.push(created)
        res.writeHead(201)
        res.end(JSON.stringify(created))
      })
      return
    }
    res.writeHead(200)
    res.end(JSON.stringify(categories))
    return
  }

  if (path === "/api/slips/extract" && req.method === "POST") {
    let raw = ""
    req.on("data", chunk => { raw += chunk.toString("latin1") })
    req.on("end", () => {
      res.writeHead(200)
      if (raw.includes("limit.png")) {
        res.end(JSON.stringify([{ filename: "limit.png", success: false, error: "Error: Gemini request failed (429): RESOURCE_EXHAUSTED" }]))
        return
      }
      res.end(JSON.stringify([{
        filename: "slip.png", success: true,
        data: { amount: 250, type: "expense", date: "2026-10-13T12:30", description: "7-Eleven" },
      }]))
    })
    return
  }

  if (path === "/api/voice/parse" && req.method === "POST") {
    let body = ""
    req.on("data", chunk => { body += chunk })
    req.on("end", () => {
      const { text = "" } = JSON.parse(body || "{}")
      res.writeHead(200)
      if (/nothing/i.test(text)) {
        res.end(JSON.stringify({ amount: null, type: "expense", categoryId: null, description: text, date: null, source: "rules" }))
        return
      }
      res.end(JSON.stringify({ amount: 85, type: "expense", categoryId: 1, description: "coffee", date: "2026-10-12", source: "ai" }))
    })
    return
  }

  if (path === "/api/goals" && req.method === "POST") {
    let body = ""
    req.on("data", chunk => { body += chunk })
    req.on("end", () => {
      res.writeHead(201)
      res.end(JSON.stringify({ id: 50, saved: 0, accounts: [], ...JSON.parse(body || "{}") }))
    })
    return
  }

  if (/^\/api\/goals\/\d+\/(deposit|withdraw|spend)$/.test(path) && req.method === "POST") {
    let body = ""
    req.on("data", chunk => { body += chunk })
    req.on("end", () => {
      res.writeHead(201)
      res.end(JSON.stringify({ id: 60, ...JSON.parse(body || "{}") }))
    })
    return
  }

  if ((path === "/api/bonds" && req.method === "POST") || (/^\/api\/bonds\/\d+$/.test(path) && req.method === "PUT")) {
    let body = ""
    req.on("data", chunk => { body += chunk })
    req.on("end", () => {
      res.writeHead(path === "/api/bonds" ? 201 : 200)
      res.end(JSON.stringify({ id: 80, ...JSON.parse(body || "{}") }))
    })
    return
  }

  if (path === "/api/portfolio/price/APP") {
    res.writeHead(200)
    res.end(JSON.stringify({ symbol: "APP", name: "Applovin Corporation", price: 260, currency: "USD", usdthb: 30 }))
    return
  }

  if ((path === "/api/portfolio" || path === "/api/portfolio/sell") && req.method === "POST") {
    let body = ""
    req.on("data", chunk => { body += chunk })
    req.on("end", () => {
      const parsed = JSON.parse(body || "{}")
      // Mirrors the real server's rule: you can't sell more than you hold.
      if (path.endsWith("/sell") && parsed.quantity > 2) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: "You only hold 2 shares of APP." }))
        return
      }
      res.writeHead(201)
      res.end(JSON.stringify({ id: 77, ...parsed }))
    })
    return
  }

  if (path === "/api/transactions" && req.method === "POST") {
    let body = ""
    req.on("data", chunk => { body += chunk })
    req.on("end", () => {
      res.writeHead(201)
      res.end(JSON.stringify({ id: 99, ...JSON.parse(body || "{}") }))
    })
    return
  }

  if (path in FIXTURES) {
    res.writeHead(200)
    res.end(JSON.stringify(FIXTURES[path]))
    return
  }
  res.writeHead(200)
  res.end(path.startsWith("/api/") ? "[]" : "{}")
})

server.listen(port, () => {
  console.log(`mock-api-server listening on ${port}`)
})
