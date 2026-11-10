"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAddSheet } from "@/components/AddSheet"
import InboxReview from "@/components/InboxReview"

// The same review as the bell's pop-up on Home, as a page of its own (Manage → Slip inbox).
export default function InboxPage() {
  const router = useRouter()
  const { toast } = useAddSheet()

  return (
    <main className="slip-page">
      <div className="slip-head">
        <Link href="/" className="slip-back" aria-label="Back to Home">‹ <span>Slips to check</span></Link>
      </div>
      <InboxReview onAllDone={() => { toast("All checked"); router.push("/") }} />
    </main>
  )
}
