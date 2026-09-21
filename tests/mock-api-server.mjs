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

const FIXTURES = {
  "/api/accounts": [account],
  "/api/transactions": [transaction],
  "/api/categories": [category],
}

const server = createServer((req, res) => {
  res.setHeader("Content-Type", "application/json")
  const path = (req.url ?? "").split("?")[0]
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
