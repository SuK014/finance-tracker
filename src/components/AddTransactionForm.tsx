"use client"

import { useState } from "react"
import { createTransaction } from "@/lib/api"
import { useRouter } from "next/navigation"

export default function AddTransactionForm({accounts}:{accounts:any[]}){
  const router = useRouter()
  const [form, setForm] = useState({
    amount:"",
    type:"expense",
    date:"",
    time: "", 
    description:"",
    accountId:"",
  })

  async function handleSubmit(e: React.FormEvent){
    e.preventDefault()
    await createTransaction({
      amount:Number(form.amount),
      type:form.type,
      date: form.time 
          ? `${form.date}T${form.time}` 
          : form.date,
      description:form.description,
      accountId:Number(form.accountId),
    })
    router.refresh()
  }
  
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <select
        value={form.accountId}
        onChange={e => setForm({ ...form, accountId: e.target.value })}
        required
      >
        <option value="">Select account</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <select
        value={form.type}
        onChange={e => setForm({ ...form, type: e.target.value })}
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input
        type="number"
        placeholder="Amount"
        value={form.amount}
        onChange={e => setForm({ ...form, amount: e.target.value })}
        required
      />
      <input
        type="date"
        value={form.date}
        onChange={e => setForm({ ...form, date: e.target.value })}
        required
      />
      <input
        type="time"
        value={form.time}
        onChange={e => setForm({ ...form, time: e.target.value })}
      />
      <input
        type="text"
        placeholder="Description"
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
      />
      <button type="submit">Add Transaction</button>
    </form>
  )

}