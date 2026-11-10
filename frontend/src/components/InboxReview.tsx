"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getAccounts, getCategories, getInbox, type InboxSlip } from "@/lib/api"
import SlipForm from "@/components/SlipForm"

const POLL_MS = 2000
const POLL_TRIES = 15

// Checks waiting slips one at a time: read, fix, confirm or reject. It lives inside the Home pop-up (the bell)
// and on the /inbox page. The parent hears how many are left, and when the last one has been handled.
export default function InboxReview({
  onAllDone,
  onRemaining,
}: {
  onAllDone: () => void
  onRemaining?: (left: number) => void
}) {
  const [slips, setSlips] = useState<InboxSlip[] | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [handled, setHandled] = useState(0)
  const tries = useRef(0)
  // The parent may pass new function objects on every render; keep the latest without re-running effects
  const callbacks = useRef({ onAllDone, onRemaining })
  callbacks.current = { onAllDone, onRemaining }

  const load = useCallback(async () => {
    setError(null)
    try {
      const [inbox, accs, cats] = await Promise.all([getInbox(), getAccounts(), getCategories()])
      setSlips(inbox.slips)
      setAccounts(Array.isArray(accs) ? accs : [])
      setCategories(Array.isArray(cats) ? cats : [])
      callbacks.current.onRemaining?.(inbox.slips.length)
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

  function done() {
    const left = (slips?.length ?? 1) - 1
    setHandled(h => h + 1)
    setSlips(prev => (prev ? prev.slice(1) : prev))
    callbacks.current.onRemaining?.(left)
    if (left === 0) callbacks.current.onAllDone()
  }

  const total = handled + (slips?.length ?? 0)

  return (
    <div className="slip-review">
      {current && <p className="slip-count">{handled + 1} of {total}</p>}

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
    </div>
  )
}
