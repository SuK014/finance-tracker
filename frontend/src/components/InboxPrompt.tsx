"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import BottomSheet from "@/components/BottomSheet"
import { getInbox } from "@/lib/api"

// "Later" lasts for this visit to the app (the browser tab), so the pop-up does not come back every time you
// return to Home, but it does the next time you open the app. The banner stays until the slips are handled.
const LATER_KEY = "inboxLater"

function seenThisVisit() {
  try { return sessionStorage.getItem(LATER_KEY) === "1" } catch { return false }
}

function rememberThisVisit() {
  try { sessionStorage.setItem(LATER_KEY, "1") } catch {}
}

export default function InboxPrompt() {
  const router = useRouter()
  const [count, setCount] = useState(0)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    let alive = true
    getInbox()
      .then(r => {
        if (!alive || !r?.count) return
        setCount(r.count)
        setAsking(!seenThisVisit())
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  function later() {
    rememberThisVisit()
    setAsking(false)
  }

  function review() {
    rememberThisVisit()
    router.push("/inbox")
  }

  if (!count) return null
  const one = count === 1

  return (
    <>
      <Link href="/inbox" className="inbox-banner">
        <span aria-hidden="true">📥</span>
        <span className="inbox-banner-text">{count} {one ? "slip" : "slips"} to check</span>
        <span className="inbox-banner-go" aria-hidden="true">›</span>
      </Link>

      {asking && (
        <BottomSheet title={one ? "1 slip is waiting" : `${count} slips are waiting`} onClose={later}>
          <div className="inbox-ask">
            <p>Check {one ? "it" : "them"} before {one ? "it counts" : "they count"} in your totals.</p>
            <div className="inbox-ask-actions">
              <button type="button" onClick={later}>Later</button>
              <button type="button" className="btn-primary" onClick={review}>Review now</button>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  )
}
