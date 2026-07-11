
const API_URL = process.env.NEXT_PUBLIC_API_URL

// Account
export async function getAccounts(){
    const res = await fetch(`${API_URL}/api/accounts`)
    return res.json()
}

export async function createAccount(data: {name :string; type: string; bankName?:string}){
    const res = await fetch(`${API_URL}/api/accounts`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    })
    return res.json()
}

// Transaction
export async function getTransactions(accountId?: number){
    const url = accountId
        ?`${API_URL}/api/transactions?accountId=${accountId}`
        : `${API_URL}/api/transactions`
    const res = await fetch(url)
    return res.json()
}

export async function createTransaction(data: { amount: number; type: string; date: string; accountId: number; categoryId?: number; description?: string }
) {
    const res = await fetch(`${API_URL}/api/transactions`,{
        method:"POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    })
    return res.json()
}