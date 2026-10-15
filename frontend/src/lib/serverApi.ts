import { cookies } from "next/headers"

const API_URL = process.env.NEXT_PUBLIC_API_URL

async function serverFetch(url: string, options: RequestInit = {}) {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value
    return fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers ?? {}),
        },
        cache: "no-store",
    })
}

async function safeArray(res: Response): Promise<any[]> {
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
}

export async function getAccounts(): Promise<any[]> {
    const res = await serverFetch(`${API_URL}/api/accounts`)
    return safeArray(res)
}

export async function getTransactions(accountId?: number, month?: string): Promise<any[]> {
    const params = new URLSearchParams()
    if (accountId) params.set("accountId", String(accountId))
    if (month) params.set("month", month)
    const query = params.toString()
    const url = `${API_URL}/api/transactions${query ? `?${query}` : ""}`
    const res = await serverFetch(url)
    return safeArray(res)
}

export async function getCategories(): Promise<any[]> {
    const res = await serverFetch(`${API_URL}/api/categories`)
    return safeArray(res)
}

export async function getPortfolio(): Promise<any[]> {
    const res = await serverFetch(`${API_URL}/api/portfolio`)
    return safeArray(res)
}

export async function getUsdThb(): Promise<number | null> {
    try {
        const res = await serverFetch(`${API_URL}/api/portfolio/fx`)
        if (!res.ok) return null
        const data = await res.json()
        return typeof data?.usdthb === "number" && data.usdthb > 0 ? data.usdthb : null
    } catch {
        return null
    }
}

export async function getGoals(): Promise<any[]> {
    const res = await serverFetch(`${API_URL}/api/goals`)
    return safeArray(res)
}

export async function getBonds(): Promise<any[]> {
    const res = await serverFetch(`${API_URL}/api/bonds`)
    return safeArray(res)
}

export async function getLots(): Promise<any[]> {
    const res = await serverFetch(`${API_URL}/api/portfolio/lots`)
    return safeArray(res)
}

export async function getRecurring(): Promise<any[]> {
    const res = await serverFetch(`${API_URL}/api/recurring`)
    return safeArray(res)
}

export async function getMonthlyReport(year: number): Promise<any[]> {
    const res = await serverFetch(`${API_URL}/api/reports/monthly?year=${year}`)
    return safeArray(res)
}
