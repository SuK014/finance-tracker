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
      className="px-3 py-2 rounded hover:bg-gray-100 text-left text-red-500 mt-auto"
    >
      Logout
    </button>
  )
}
