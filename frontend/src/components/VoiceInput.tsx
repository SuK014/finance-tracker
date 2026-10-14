"use client"

import { useEffect, useRef, useState } from "react"
import { parseVoice, type VoiceParse } from "@/lib/api"

type Cat = { id: number; name: string; type?: string }

// Minimal typing for the browser speech API (not in lib.dom for every TS version).
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function getRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function voiceError(code: string): string {
  if (code === "not-allowed" || code === "service-not-allowed")
    return "Microphone access is blocked. Allow it in your browser settings, or type it below."
  if (code === "no-speech") return "Didn't hear anything. Tap Say it and try again."
  if (code === "network") return "Speech recognition needs an internet connection."
  if (code === "audio-capture") return "No microphone was found."
  return "Couldn't hear that. Try again, or type it below."
}

function localToday() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// "Say it": speak (or type) a sentence like "coffee 85 yesterday"; the parsed
// fields are handed to the Add sheet to review. Nothing is saved from here.
export default function VoiceInput({
  categories,
  onResult,
}: {
  categories: Cat[]
  onResult: (r: VoiceParse, heard: string) => void
}) {
  const [supported, setSupported] = useState(false)
  const [lang, setLang] = useState<"th-TH" | "en-US">("th-TH")
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState("")
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<Recognition | null>(null)
  const heardRef = useRef("")
  const failedRef = useRef(false)

  useEffect(() => {
    setSupported(getRecognition() !== null)
    try {
      const saved = localStorage.getItem("voiceLang")
      if (saved === "th-TH" || saved === "en-US") setLang(saved)
    } catch {}
    return () => recRef.current?.stop()
  }, [])

  function pickLang(l: "th-TH" | "en-US") {
    setLang(l)
    try { localStorage.setItem("voiceLang", l) } catch {}
  }

  async function submit(text: string) {
    const clean = text.trim()
    if (!clean) return
    setError(null)
    setBusy(true)
    try {
      const r = await parseVoice(clean, localToday(), categories)
      if (r.error) { setError(r.error); return }
      onResult(r, clean)
      setTyped("")
    } catch {
      setError("Couldn't understand that. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  function toggle() {
    if (listening) { recRef.current?.stop(); return }
    const Ctor = getRecognition()
    if (!Ctor) return
    setError(null)
    setHeard("")
    heardRef.current = ""
    failedRef.current = false
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = e => {
      let text = ""
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      heardRef.current = text
      setHeard(text)
    }
    rec.onerror = e => {
      failedRef.current = true
      setError(voiceError(e.error))
    }
    rec.onend = () => {
      setListening(false)
      recRef.current = null
      if (!failedRef.current) {
        if (heardRef.current.trim()) submit(heardRef.current)
        else setError(voiceError("no-speech"))
      }
    }
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setError(voiceError("unknown"))
    }
  }

  return (
    <div className="voice">
      {supported && (
        <div className="voice-row">
          <button type="button" className="voice-btn" data-listening={listening} onClick={toggle} disabled={busy}>
            <span aria-hidden="true">{listening ? "■" : "🎤"}</span>{" "}
            {listening ? "Stop" : busy ? "Understanding…" : "Say it"}
          </button>
          <div className="seg voice-lang" role="group" aria-label="Spoken language">
            {([["th-TH", "TH"], ["en-US", "EN"]] as const).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={lang === v} disabled={listening} onClick={() => pickLang(v)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {listening && (
        <p className="sheet-note" role="status">
          Listening… {heard ? <q>{heard}</q> : "say something like “coffee 85 yesterday”"}
        </p>
      )}
      {!listening && heard && !error && busy && <p className="sheet-note"><q>{heard}</q></p>}
      <div className="voice-type">
        <input
          type="text"
          className="field-input"
          aria-label={supported ? "Or type it" : "Type it instead"}
          placeholder={supported ? "Or type it: coffee 85 yesterday" : "Type it: coffee 85 yesterday"}
          value={typed}
          onChange={e => setTyped(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(typed) } }}
        />
        <button type="button" onClick={() => submit(typed)} disabled={busy || !typed.trim()}>Fill in</button>
      </div>
      {error && <p className="sheet-error" role="alert">{error}</p>}
    </div>
  )
}
