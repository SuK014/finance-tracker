"use client"

import { useState } from "react"
import { createAccount } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function AddAccountForm(){
  const router = useRouter()
  const [form, setForm] = useState({
    name:"",
    type: "bank",
    bankName:"",
    
  })

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    await createAccount({
        name:form.name,
        type:form.type,
        bankName:form.bankName,
    })
    router.refresh()
  }
  
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      
      <input
        type="text"
        placeholder="name"
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
      />
      <select 
        value={form.type}
        onChange={e => setForm({ ...form, type: e.target.value })}
      >
        <option value="bank">Bank</option>
        <option value="wallet">Wallet</option>
        <option value="credit_card">Credit Card</option>
      </select>
      <input
        type="text"
        placeholder="Bank Name"
        value={form.bankName}
        onChange={e => setForm({ ...form, bankName: e.target.value })}
      />
      <button type="submit">Add Account</button>
    </form>
  )

}