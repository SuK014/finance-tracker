"use client"

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { getTransactions } from "@/lib/api"

// Suggests notes you have used before while you type, in a list that follows the app theme. (The browser's own
// saved-entries list is white in dark mode and can't be styled, so it is switched off for this field.)

const MAX_SHOWN = 6
const KEEP_FOR_MS = 60_000

let cache: { at: number; notes: string[] } | null = null
let inflight: Promise<string[]> | null = null

// Distinct notes from your transactions, newest first. Fetched once and reused for a minute across fields.
function loadNotes(): Promise<string[]> {
  if (cache && Date.now() - cache.at < KEEP_FOR_MS) return Promise.resolve(cache.notes)
  inflight ??= getTransactions()
    .then((rows: unknown) => {
      const list = Array.isArray(rows) ? [...rows] : []
      list.sort((a, b) => new Date(b?.date ?? 0).getTime() - new Date(a?.date ?? 0).getTime())
      const seen = new Set<string>()
      const notes: string[] = []
      for (const row of list) {
        const text = typeof row?.description === "string" ? row.description.trim() : ""
        if (text && !seen.has(text.toLowerCase())) { seen.add(text.toLowerCase()); notes.push(text) }
      }
      cache = { at: Date.now(), notes: notes.slice(0, 200) }
      return cache.notes
    })
    .catch(() => [] as string[])
    .finally(() => { inflight = null })
  return inflight
}

// The nearest ancestor that scrolls (a pop-up's fields area), so the list can stay inside it
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let parent = el?.parentElement ?? null
  while (parent) {
    const overflowY = getComputedStyle(parent).overflowY
    if (overflowY === "auto" || overflowY === "scroll") return parent
    parent = parent.parentElement
  }
  return null
}

const ROW_PX = 44
const LIST_MAX_PX = 260

export default function NoteInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  placeholder?: string
}) {
  const listId = useId()
  const [notes, setNotes] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [fit, setFit] = useState<{ up: boolean; max: number }>({ up: false, max: LIST_MAX_PX })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    loadNotes().then(n => { if (alive) setNotes(n) })
    return () => { alive = false }
  }, [])

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    const found = q ? notes.filter(n => n.toLowerCase().includes(q) && n.toLowerCase() !== q) : notes
    return found.slice(0, MAX_SHOWN)
  }, [notes, value])

  const show = open && matches.length > 0

  // Open on whichever side has more room, and never taller than that room, so the list is never cut off by
  // the edge of a scrolling area or hidden behind a button bar
  useLayoutEffect(() => {
    if (!show || !inputRef.current) return
    const box = inputRef.current.getBoundingClientRect()
    const area = scrollParent(inputRef.current)?.getBoundingClientRect()
    const top = Math.max(area?.top ?? 0, 0)
    const bottom = Math.min(area?.bottom ?? window.innerHeight, window.innerHeight)
    const below = bottom - box.bottom - 14
    const above = box.top - top - 14
    const wanted = Math.min(matches.length * ROW_PX + 12, LIST_MAX_PX)
    const up = below < wanted && above > below
    setFit({ up, max: Math.max(120, Math.min(LIST_MAX_PX, up ? above : below)) })
  }, [show, matches.length])

  function pick(note: string) {
    onChange(note)
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!show) {
      if (e.key === "ArrowDown" && matches.length > 0) { e.preventDefault(); setOpen(true); setActive(0) }
      return
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => (a + 1) % matches.length) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => (a <= 0 ? matches.length - 1 : a - 1)) }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(matches[active]) }
    else if (e.key === "Escape") { setOpen(false); setActive(-1) }
  }

  return (
    <div className="note-field">
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="field-input"
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1) }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => { setOpen(false); setActive(-1) }}
        onKeyDown={onKeyDown}
      />
      {show && (
        <ul id={listId} role="listbox" className="note-list" data-up={fit.up} style={{ maxHeight: fit.max }} aria-label="Notes you used before">
          {matches.map((note, i) => (
            <li
              key={note}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the input would lose focus (and close the list) before a click lands
              onMouseDown={e => { e.preventDefault(); pick(note) }}
              onMouseEnter={() => setActive(i)}
            >
              {note}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
