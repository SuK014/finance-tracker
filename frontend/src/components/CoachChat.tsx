"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  COACH_ENABLED, CoachError, OFFLINE_FIX, OFFLINE_REASONS, askCoach, coachErrorMessage, coachHealth,
  hasThai, resultPairs, safeUrl, toolLabel, whoAnswered,
  type CoachReply, type CoachHealth, type UatMeta,
} from "@/lib/coach"

// "Ask Buddy": a floating button that opens a chat with the Budget Buddy coach running on this computer.
// Mounted once in AppShell and shown only when NEXT_PUBLIC_COACH_ENABLED=true. The conversation is not remembered
// by the coach: every question is answered on its own, and "New chat" just clears what is on screen.

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "coach"; text: string; reply: CoachReply }
  | { id: number; role: "error"; text: string; question: string }

const SLOW_AFTER_MS = 15_000
const POLL_OFFLINE_MS = 5_000
const POLL_READY_MS = 30_000
const CLOSE_MS = 180

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4.5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-6.2L8 20.5V17H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" />
      <path d="M7.5 9.5h5" />
      <circle cx="16" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M7.5 12.5h3" />
    </svg>
  )
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
)

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
)

function Receipt({ reply }: { reply: CoachReply }) {
  const tip = reply.tip
  const tipUrl = safeUrl(tip?.url)
  return (
    <details className="coach-receipt">
      <summary>How I got this</summary>
      {reply.receipt.length === 0 ? (
        <p className="coach-receipt-empty">No figures were looked up for this reply.</p>
      ) : (
        <ul className="coach-receipt-rows">
          {reply.receipt.map((row, i) => (
            <li key={i} className="coach-receipt-row">
              <span className="coach-receipt-label">{toolLabel(row.tool, row.args)}</span>
              <span className="coach-receipt-values num">
                {resultPairs(row.result).map(([label, value], j) => (
                  <span key={j}>{label ? <span className="coach-receipt-key">{label}</span> : null}{value}</span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
      {tip?.title ? (
        <p className="coach-receipt-source">
          Tip source:{" "}
          {tipUrl ? <a href={tipUrl} target="_blank" rel="noopener noreferrer">{tip.title}</a> : tip.title}
        </p>
      ) : null}
      <p className="coach-receipt-who">{whoAnswered(reply)}</p>
    </details>
  )
}

export default function CoachChat() {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [health, setHealth] = useState<CoachHealth & { checked: boolean }>({
    ready: false, reason: "", checked: false, email: null, persona: null, uatPersonas: {},
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [pending, setPending] = useState(false)
  const [slow, setSlow] = useState(false)
  const [draft, setDraft] = useState("")
  const [uatMode, setUatMode] = useState(false)
  const [uatRound, setUatRound] = useState("")
  const [uatTester, setUatTester] = useState("")
  const [uatTask, setUatTask] = useState("")

  useEffect(() => setUatMode(new URLSearchParams(window.location.search).get("uat") === "1"), [])

  const fabRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const nextId = useRef(1)
  const chatId = useRef<string | null>(null)
  const attempts = useRef<Record<string, number>>({})
  const wasOpen = useRef(false)

  // Health: re-check often while the coach is down so the button recovers by itself, and slowly while it is up.
  const refreshHealth = useCallback(async () => {
    if (document.hidden) return
    const h = await coachHealth()
    setHealth({ ...h, checked: true })
  }, [])
  useEffect(() => {
    if (!COACH_ENABLED) return
    void refreshHealth()
    const timer = window.setInterval(() => void refreshHealth(), health.ready ? POLL_READY_MS : POLL_OFFLINE_MS)
    return () => window.clearInterval(timer)
  }, [refreshHealth, health.ready])

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, pending])

  // Focus the input when the panel opens (if it can take input), and put focus back on the button when it closes.
  useEffect(() => {
    if (open && !wasOpen.current) window.setTimeout(() => inputRef.current?.focus(), 0)
    if (!open && wasOpen.current) fabRef.current?.focus()
    wasOpen.current = open
  }, [open])

  function close() {
    setClosing(true)
    window.setTimeout(() => { setOpen(false); setClosing(false) }, CLOSE_MS)
  }

  function newChat() {
    abortRef.current?.abort()
    setMessages([])
    setPending(false)
    setSlow(false)
    setUatTask("")
    chatId.current = crypto.randomUUID()
    attempts.current = {}
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function send(question: string) {
    const q = question.trim()
    if (!q || pending || (uatMode && (!uatRound || !uatTester || !uatTask ||
        health.uatPersonas[uatTask] !== health.persona))) return
    setMessages(m => [...m, { id: nextId.current++, role: "user", text: q }])
    setDraft("")
    setPending(true)
    setSlow(false)
    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    const ctl = new AbortController()
    abortRef.current = ctl
    try {
      const uat: UatMeta | null = uatMode ? {
        round: Number(uatRound) as UatMeta["round"],
        tester_number: Number(uatTester) as UatMeta["tester_number"],
        task_id: uatTask,
        chat_id: chatId.current ?? (chatId.current = crypto.randomUUID()),
        attempt: (attempts.current[uatTask] = (attempts.current[uatTask] ?? 0) + 1),
      } : null
      const reply = await askCoach(q, uat, ctl.signal)
      setMessages(m => [...m, { id: nextId.current++, role: "coach", text: reply.answer, reply }])
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      const code = e instanceof CoachError ? e.code : "answer_failed"
      setMessages(m => [...m, { id: nextId.current++, role: "error", text: coachErrorMessage(code), question: q }])
      void refreshHealth()
    } finally {
      window.clearTimeout(slowTimer)
      if (abortRef.current === ctl) { setPending(false); setSlow(false) }
    }
  }

  if (!COACH_ENABLED) return null

  const offline = health.checked && !health.ready
  const uatExpectedPersona = health.uatPersonas[uatTask]
  const uatIdentityMatches = !!uatExpectedPersona && uatExpectedPersona === health.persona
  const state = closing ? "closing" : "open"

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className="coach-fab"
        data-offline={offline ? "true" : undefined}
        data-hidden={open ? "true" : undefined}
        aria-label={offline ? "Ask Buddy (offline)" : "Ask Buddy"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        tabIndex={open ? -1 : 0}
      >
        <ChatIcon />
      </button>

      {open ? (
        <>
          <div className="coach-backdrop" data-state={state} onClick={close} aria-hidden="true" />
          <div
            className="coach-panel"
            data-state={state}
            role="dialog"
            aria-label="Ask Buddy"
            onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); close() } }}
          >
            <header className="coach-head">
              <h2>Ask Buddy</h2>
              <div className="coach-head-actions">
                {messages.length > 0 ? (
                  <button type="button" className="coach-text-btn" onClick={newChat}>New chat</button>
                ) : null}
                <button type="button" className="coach-icon-btn" onClick={close} aria-label="Close chat">
                  <CloseIcon />
                </button>
              </div>
            </header>

            <div className="coach-log" ref={logRef} role="log" aria-live="polite" aria-label="Conversation">
              {messages.length === 0 && !offline ? (
                <p className="coach-hint">
                  Ask in Thai or English. I can look up your spending and budgets, and share saving tips. I only see your own transactions.
                </p>
              ) : null}

              {offline ? (
                <div className="coach-offline" role="status">
                  <p className="coach-offline-title">{OFFLINE_REASONS[health.reason] ?? "Coach isn't running."}</p>
                  <p>{OFFLINE_FIX[health.reason] ?? "Start it with python dev.py serve"}. This page checks again every few seconds.</p>
                </div>
              ) : null}

              {messages.map(m =>
                m.role === "user" ? (
                  <div key={m.id} className="coach-msg coach-msg-user" lang={hasThai(m.text) ? "th" : undefined}>{m.text}</div>
                ) : m.role === "coach" ? (
                  <div key={m.id} className="coach-msg coach-msg-coach">
                    <p lang={hasThai(m.text) ? "th" : undefined}>{m.text}</p>
                    {m.reply.options?.length && m.id === messages[messages.length - 1]?.id ? (
                      <div className="coach-options" role="group" aria-label="Quick replies">
                        {m.reply.options.map(o => (
                          <button
                            key={o.question}
                            type="button"
                            className="coach-option"
                            lang={hasThai(o.label) ? "th" : undefined}
                            disabled={pending || offline}
                            onClick={() => void send(o.question)}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {m.reply.route === "clarify" ? null : <Receipt reply={m.reply} />}
                  </div>
                ) : (
                  <div key={m.id} className="coach-msg coach-msg-error" role="alert">
                    <p>{m.text}</p>
                    <button type="button" className="coach-text-btn" onClick={() => void send(m.question)} disabled={pending || offline}>
                      Try again
                    </button>
                  </div>
                ),
              )}

              {pending ? (
                <div className="coach-pending" role="status">
                  <span className="coach-dots" aria-hidden="true"><i /><i /><i /></span>
                  <span>Checking your transactions…</span>
                  {slow ? <span className="coach-slow">The local model is still loading. The first answer can take up to a minute.</span> : null}
                </div>
              ) : null}
            </div>

            {uatMode ? (
              <div className="coach-uat" role="group" aria-label="UAT operator details">
                <p className="coach-uat-identity">Signed in as: {health.email ?? (health.checked
                  ? "Unavailable — sign out and sign in again" : "Checking account…")}</p>
                <label>Round
                  <select value={uatRound} onChange={e => setUatRound(e.target.value)} disabled={pending}>
                    <option value="">Choose</option><option value="1">1</option><option value="2">2</option>
                  </select>
                </label>
                <label>Tester number
                  <select value={uatTester} onChange={e => setUatTester(e.target.value)} disabled={pending}>
                    <option value="">Choose</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label>Task ID
                  <select value={uatTask} onChange={e => setUatTask(e.target.value)} disabled={pending}>
                    <option value="">Choose</option>{Array.from({ length: 11 }, (_, i) => `UAT-${String(i + 1).padStart(2, "0")}`).map(id =>
                      <option key={id} value={id}>{id}{health.uatPersonas[id] ? ` · ${health.uatPersonas[id]}` : ""}</option>) }
                  </select>
                </label>
                {uatTask && !uatIdentityMatches ? (
                  <p className="coach-uat-mismatch" role="alert">{uatExpectedPersona
                    ? `${uatTask} belongs to ${uatExpectedPersona}. Sign out and sign in as ${uatExpectedPersona}.`
                    : "Could not verify the signed-in demo account."}</p>
                ) : null}
              </div>
            ) : null}

            <form
              className="coach-form"
              onSubmit={e => { e.preventDefault(); void send(draft) }}
            >
              <label htmlFor="coach-input" className="coach-sr">Your question</label>
              <textarea
                id="coach-input"
                ref={inputRef}
                className="coach-input"
                rows={1}
                maxLength={500}
                value={draft}
                disabled={offline}
                placeholder={offline ? "Coach is offline" : "Ask about your money"}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  // Enter sends; Shift+Enter adds a line. Never send while a Thai/Japanese IME is still composing.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    void send(draft)
                  }
                }}
              />
              <button type="submit" className="coach-send" aria-label="Send question" disabled={offline || pending || !draft.trim() || (uatMode && (!uatRound || !uatTester || !uatTask || !uatIdentityMatches))}>
                <SendIcon />
              </button>
            </form>
          </div>
        </>
      ) : null}
    </>
  )
}
