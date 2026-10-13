// Minimal fake backend used only by Playwright E2E tests.
// Never touches the real database — /api/* routes return fixture data (or
// empty arrays where no fixture is defined) regardless of auth, so pages
// render real content without a live backend.
import { createServer } from "node:http"

const port = process.env.MOCK_API_PORT || 3055

const account = { id: 1, name: "Kasikorn", type: "bank", bankName: "Kasikorn", currency: "THB", balance: 1000 }
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

const FIXTURES = {
  "/api/accounts": [account],
  "/api/transactions": [transaction],
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

  if (path === "/api/categories") {
    if (req.method === "POST") {
      let body = ""
      req.on("data", chunk => { body += chunk })
      req.on("end", () => {
        const parsed = JSON.parse(body || "{}")
        const created = { id: nextCategoryId++, name: parsed.name, color: parsed.color, type: parsed.type ?? "expense" }
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
