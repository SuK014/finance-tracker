"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getAccounts, getCategories, getInbox, type InboxSlip } from "@/lib/api"
import { useAddSheet } from "@/components/AddSheet"
import SlipForm from "@/components/SlipForm"

const POLL_MS = 2000
const POLL_TRIES = 15

export default function InboxPage() {
  const router = useRouter()
  const { toast } = useAddSheet()
  const [slips, setSlips] = useState<InboxSlip[] | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [handled, setHandled] = useState(0)
  const tries = useRef(0)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [inbox, accs, cats] = await Promise.all([getInbox(), getAccounts(), getCategories()])
      setSlips(inbox.slips)
      setAccounts(Array.isArray(accs) ? accs : [])
      setCategories(Array.isArray(cats) ? cats : [])
    } catch {
      setError("Couldn't load your slips. Check your connection and try again.")
    }
  }, [])

  useEffect(() => { load() }, [load])

  // A slip that arrived a moment ago may still be being read; check again until it has been.
  const current = slips?.[0]
  const currentId = current?.id
  const reading = current != null && current.parsedBy === null
  useEffect(() => {
    if (!reading) { tries.current = 0; return }
    if (tries.current >= POLL_TRIES) return
    const timer = window.setTimeout(async () => {
      tries.current += 1
      try {
        const inbox = await getInbox()
        setSlips(prev => (prev ? prev.map(s => inbox.slips.find(n => n.id === s.id) ?? s) : prev))
      } catch {}
    }, POLL_MS)
    return () => window.clearTimeout(timer)
  }, [reading, currentId, slips])

  function done(kind: "confirmed" | "rejected") {
    const left = (slips?.length ?? 1) - 1
    setHandled(h => h + 1)
    setSlips(prev => (prev ? prev.slice(1) : prev))
    if (left === 0) {
      toast("All checked")
      router.push("/")
    }
  }

  const total = handled + (slips?.length ?? 0)

  return (
    <main className="slip-page">
      <div className="slip-head">
        <Link href="/" className="slip-back" aria-label="Back to Home">‹ <span>Slips to check</span></Link>
        {current && <span className="slip-count">{handled + 1} of {total}</span>}
      </div>

      {error && (
        <div className="sheet-warn" role="alert">
          {error} <button type="button" onClick={load}>Try again</button>
        </div>
      )}

      {!error && slips === null && <p className="slip-empty" role="status">Loading your slips…</p>}

      {slips && slips.length === 0 && (
        <div className="slip-empty">
          <p>No slips to check.</p>
          <p>Slips from your iPhone show up here.</p>
        </div>
      )}

      {current && <SlipForm key={`${current.id}-${current.parsedBy ?? "reading"}`} slip={current} accounts={accounts} categories={categories} onDone={done} />}
    </main>
  )
}
