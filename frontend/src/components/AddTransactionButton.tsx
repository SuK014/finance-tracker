"use client"

import { useAddSheet } from "@/components/AddSheet"

export default function AddTransactionButton({ className, style, children }: {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}) {
  const { open } = useAddSheet()
  return (
    <button type="button" className={className} style={style} onClick={open}>
      {children ?? "+ Add transaction"}
    </button>
  )
}
