"use client"

import { useRouter } from "next/navigation"
import { logout } from "@/lib/api"

export default function LogoutButton() {
  const router = useRouter()

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        textAlign: "left",
        color: "var(--expense)",
        background: "transparent",
        border: "1px solid var(--border)",
      }}
    >
      Logout
    </button>
  )
}
