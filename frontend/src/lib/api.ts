const API_URL = process.env.NEXT_PUBLIC_API_URL

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
    }
}

// Auth
export async function login(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    })
    return res.json() as Promise<{ token?: string; email?: string; error?: string }>
}

export async function register(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    })
    return res.json() as Promise<{ token?: string; email?: string; error?: string }>
}

export function logout() {
    localStorage.removeItem("token")
    document.cookie = "token=; max-age=0; path=/"
}

export function saveToken(token: string) {
    localStorage.setItem("token", token)
    document.cookie = `token=${token}; max-age=${60 * 60 * 24 * 30}; path=/`
}

// Account
export async function getAccounts() {
    const res = await fetch(`${API_URL}/api/accounts`, { headers: authHeaders() })
    return res.json()
}

export async function createAccount(data: { name: string; type: string; bankName?: string; currency?: string }) {
    const res = await fetch(`${API_URL}/api/accounts`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function updateAccount(id: number, data: { name: string; type: string; bankName?: string; currency?: string }) {
    const res = await fetch(`${API_URL}/api/accounts/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function deleteAccount(id: number) {
    await fetch(`${API_URL}/api/accounts/${id}`, { method: "DELETE", headers: authHeaders() })
}

// Transaction
export async function getTransactions(accountId?: number) {
    const url = accountId
        ? `${API_URL}/api/transactions?accountId=${accountId}`
        : `${API_URL}/api/transactions`
    const res = await fetch(url, { headers: authHeaders() })
    return res.json()
}

export async function createTransaction(data: { amount: number; type: string; date: string; accountId: number; categoryId?: number; description?: string }) {
    const res = await fetch(`${API_URL}/api/transactions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function updateTransaction(id: number, data: { amount: number; type: string; date: string; accountId: number; categoryId?: number; description?: string }) {
    const res = await fetch(`${API_URL}/api/transactions/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function deleteTransaction(id: number) {
    await fetch(`${API_URL}/api/transactions/${id}`, { method: "DELETE", headers: authHeaders() })
}

// Category
export async function getCategories() {
    const res = await fetch(`${API_URL}/api/categories`, { headers: authHeaders() })
    return res.json()
}

export async function createCategory(data: { name: string; color?: string; icon?: string; type?: string }) {
    const res = await fetch(`${API_URL}/api/categories`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function updateCategory(id: number, data: { name: string; color?: string; icon?: string | null; type?: string; budget?: number | null }) {
    const res = await fetch(`${API_URL}/api/categories/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function deleteCategory(id: number) {
    await fetch(`${API_URL}/api/categories/${id}`, { method: "DELETE", headers: authHeaders() })
}

// Portfolio
export async function getPortfolio() {
    const res = await fetch(`${API_URL}/api/portfolio`, { headers: authHeaders() })
    return res.json()
}

export async function getLots() {
    const res = await fetch(`${API_URL}/api/portfolio/lots`, { headers: authHeaders() })
    return res.json()
}

export async function getAssetPrice(symbol: string): Promise<{ symbol: string; name: string; price: number; currency: string; usdthb: number }> {
    const res = await fetch(`${API_URL}/api/portfolio/price/${symbol}`, { headers: authHeaders() })
    if (!res.ok) throw new Error("Symbol not found")
    return res.json()
}

export async function createAsset(data: { symbol: string; name: string; type: string; quantity: number; price: number; accountId?: number }) {
    const res = await fetch(`${API_URL}/api/portfolio`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function sellAsset(data: { symbol: string; quantity: number; price: number; accountId?: number }) {
    const res = await fetch(`${API_URL}/api/portfolio/sell`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function updateLot(id: number, data: { quantity: number; price: number; date?: string }) {
    const res = await fetch(`${API_URL}/api/portfolio/lots/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function deleteLot(id: number) {
    await fetch(`${API_URL}/api/portfolio/lots/${id}`, { method: "DELETE", headers: authHeaders() })
}

// Transaction evidence
export async function uploadEvidence(transactionId: number, file: File) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    const form = new FormData()
    form.append("image", file)
    const res = await fetch(`${API_URL}/api/transactions/${transactionId}/evidence`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    })
    return res.json()
}

// Auth extras
export async function changePassword(currentPassword: string, newPassword: string) {
    const res = await fetch(`${API_URL}/api/auth/password`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
    })
    return res.json() as Promise<{ success?: boolean; error?: string }>
}

// Recurring transactions
export async function getRecurring() {
    const res = await fetch(`${API_URL}/api/recurring`, { headers: authHeaders() })
    return res.json()
}

export async function createRecurring(data: {
    amount: number; type: string; description?: string
    accountId: number; categoryId?: number
    frequency: string; nextDate: string
}) {
    const res = await fetch(`${API_URL}/api/recurring`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function updateRecurring(id: number, data: {
    amount?: number; type?: string; description?: string
    accountId?: number; categoryId?: number
    frequency?: string; nextDate?: string; active?: boolean
}) {
    const res = await fetch(`${API_URL}/api/recurring/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(data),
    })
    return res.json()
}

export async function deleteRecurring(id: number) {
    await fetch(`${API_URL}/api/recurring/${id}`, { method: "DELETE", headers: authHeaders() })
}

export async function recordRecurring(id: number) {
    const res = await fetch(`${API_URL}/api/recurring/${id}/record`, {
        method: "POST",
        headers: authHeaders(),
    })
    return res.json()
}

// E-slip import
export async function extractSlips(files: File[]) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    const form = new FormData()
    files.forEach(f => form.append("images", f))
    const res = await fetch(`${API_URL}/api/slips/extract`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
    })
    return res.json() as Promise<Array<{
        filename: string
        success: boolean
        data?: { amount: number | null; type: string | null; date: string | null; description: string | null }
        error?: string
    }>>
}

// Voice add: turn a spoken or typed sentence into transaction fields.
export type VoiceParse = {
    amount: number | null
    type: "income" | "expense"
    categoryId: number | null
    description: string
    date: string | null
    source: "ai" | "rules"
    error?: string
}

export async function parseVoice(text: string, today: string, categories: Array<{ id: number; name: string; type?: string }>): Promise<VoiceParse> {
    const res = await fetch(`${API_URL}/api/voice/parse`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text, today, categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })) }),
    })
    return res.json()
}

// Savings goals
import type { Goal } from "@/lib/goals"

export type GoalInput = { name: string; icon?: string; target: number; deadline?: string | null; ruleType?: "fixed" | "percent" | null; ruleValue?: number | null }

export async function createGoal(data: GoalInput): Promise<Goal & { error?: string }> {
    const res = await fetch(`${API_URL}/api/goals`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) })
    return res.json()
}

export async function updateGoal(id: number, data: GoalInput): Promise<{ error?: string }> {
    const res = await fetch(`${API_URL}/api/goals/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(data) })
    return res.json()
}

export async function deleteGoal(id: number) {
    await fetch(`${API_URL}/api/goals/${id}`, { method: "DELETE", headers: authHeaders() })
}

export async function goalMoney(
    id: number,
    action: "deposit" | "withdraw" | "spend",
    data: { accountId: number; amount: number; categoryId?: number; description?: string },
): Promise<{ error?: string }> {
    const res = await fetch(`${API_URL}/api/goals/${id}/${action}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) })
    return res.json()
}

// Payday: record a recurring salary and set money aside for goals in one step
export async function receiveSalary(
    id: number,
    data: { amount: number; allocations: { goalId: number; amount: number }[] },
): Promise<{ error?: string; setAside?: number }> {
    const res = await fetch(`${API_URL}/api/recurring/${id}/receive`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) })
    return res.json()
}

// Bonds
export type BondInput = { name: string; principal: number; ratePct: number; startDate: string; maturityDate: string }

export async function createBond(data: BondInput): Promise<{ error?: string }> {
    const res = await fetch(`${API_URL}/api/bonds`, { method: "POST", headers: authHeaders(), body: JSON.stringify(data) })
    return res.json()
}

export async function updateBond(id: number, data: BondInput): Promise<{ error?: string }> {
    const res = await fetch(`${API_URL}/api/bonds/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(data) })
    return res.json()
}

export async function deleteBond(id: number) {
    await fetch(`${API_URL}/api/bonds/${id}`, { method: "DELETE", headers: authHeaders() })
}
