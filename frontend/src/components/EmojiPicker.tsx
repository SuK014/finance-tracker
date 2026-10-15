"use client"

import { EMOJI_CHOICES } from "@/lib/categoryIcon"

export default function EmojiPicker({ value, onChange, label = "Category icon" }: { value: string; onChange: (emoji: string) => void; label?: string }) {
  return (
    <div role="group" aria-label={label} className="emoji-grid">
      {EMOJI_CHOICES.map(e => (
        <button
          key={e}
          type="button"
          aria-pressed={value === e}
          aria-label={`Icon ${e}`}
          onClick={() => onChange(value === e ? "" : e)}
        >
          {e}
        </button>
      ))}
    </div>
  )
}
