"use client"

import { useEffect, useState } from "react"
import BottomSheet from "@/components/BottomSheet"
import InboxReview from "@/components/InboxReview"
import { useAddSheet } from "@/components/AddSheet"
import { getInbox } from "@/lib/api"

// "Later" lasts for this visit to the app (the browser tab), so the pop-up does not come back every time you
// return to Home, but it does the next time you open the app. The bell and its count stay until the slips are handled.
const LATER_KEY = "inboxLater"

function seenThisVisit() {
  try { return sessionStorage.getItem(LATER_KEY) === "1" } catch { return false }
}

function rememberThisVisit() {
  try { sessionStorage.setItem(LATER_KEY, "1") } catch {}
}

type View = "closed" | "ask" | "review"

// A bell in the top right of Home. The count on it is how many slips wait; it opens the review as a pop-up.
// Shows nothing until the inbox has loaded once, so it stays out of the way when the server can't answer.
export default function InboxBell() {
  const { toast } = useAddSheet()
  const [count, setCount] = useState<number | null>(null)
  const [view, setView] = useState<View>("closed")

  useEffect(() => {
    let alive = true
    getInbox()
      .then(r => {
        if (!alive || typeof r?.count !== "number") return
        setCount(r.count)
        if (r.count > 0 && !seenThisVisit()) setView("ask")
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  function later() {
    rememberThisVisit()
    setView("closed")
  }

  function openReview() {
    rememberThisVisit()
    setView("review")
  }

  if (count === null) return null
  const one = count === 1

  return (
    <>
      <button
        type="button"
        className="bell-btn"
        data-has={count > 0}
        aria-label={count > 0 ? `Slips to check, ${count} waiting` : "Slips to check"}
        aria-haspopup="dialog"
        onClick={openReview}
      >
        {/* Solid when slips are waiting, outline when there are none */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill={count > 0 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {count > 0 && <span className="bell-badge" aria-hidden="true">{count > 9 ? "9+" : count}</span>}
      </button>

      {view === "ask" && (
        <BottomSheet title={one ? "1 slip is waiting" : `${count} slips are waiting`} onClose={later}>
          <div className="inbox-ask">
            <p>Check {one ? "it" : "them"} before {one ? "it counts" : "they count"} in your totals.</p>
            <div className="inbox-ask-actions">
              <button type="button" onClick={later}>Later</button>
              <button type="button" className="btn-primary" onClick={openReview}>Review now</button>
            </div>
          </div>
        </BottomSheet>
      )}

      {view === "review" && (
        <BottomSheet title="Slips to check" onClose={() => setView("closed")}>
          <div className="slip-modal">
            <InboxReview
              onRemaining={setCount}
              onAllDone={() => { setView("closed"); toast("All checked") }}
            />
          </div>
        </BottomSheet>
      )}
    </>
  )
}
