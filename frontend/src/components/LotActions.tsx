"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateLot } from "@/lib/api"
import DeleteButton from "@/components/DeleteButton"
import DatePicker from "@/components/DatePicker"

type Lot = {
  id: number
  quantity: number
  price: number
  date: string
}

export default function LotActions({ lot }: { lot: Lot }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    quantity: String(lot.quantity),
    price: String(lot.price),
    date: lot.date.slice(0, 10),
  })

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await updateLot(lot.id, {
      quantity: Number(form.quantity),
      price: Number(form.price),
      date: form.date,
    })
    setEditing(false)
    router.refresh()
  }

  if (editing) {
    return (
      <form onSubmit={handleEdit} style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        <input
          type="number"
          step="any"
          min="0.000001"
          value={form.quantity}
          onChange={e => setForm({ ...form, quantity: e.target.value })}
          style={{ width: "80px" }}
        />
        <input
          type="number"
          step="any"
          min="0.000001"
          value={form.price}
          onChange={e => setForm({ ...form, price: e.target.value })}
          style={{ width: "80px" }}
        />
        <div style={{ width: "130px" }}>
          <DatePicker value={form.date} onChange={date => setForm({ ...form, date })} />
        </div>
        <button type="submit">Save</button>
        <button type="button" onClick={() => setEditing(false)}>Cancel</button>
      </form>
    )
  }

  return (
    <div style={{ display: "flex", gap: "4px" }}>
      <button type="button" onClick={() => setEditing(true)}>Edit</button>
      <DeleteButton id={lot.id} type="lot" />
    </div>
  )
}
