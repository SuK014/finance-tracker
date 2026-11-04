"use client"

import { useEffect, useState } from "react"
import { getInboxKeyStatus, makeInboxKey, removeInboxKey } from "@/lib/api"

// The key your iPhone Shortcut sends with every slip. It is shown once, when it is made; only a hash is kept.
export default function InboxKeyCard() {
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getInboxKeyStatus().then(r => setHasKey(!!r.hasKey)).catch(() => setError("Couldn't check the inbox key."))
  }, [])

  async function make() {
    if (hasKey && !window.confirm("Make a new key? The old one stops working, so paste the new one into your Shortcut.")) return
    setBusy(true)
    setError(null)
    setCopied(false)
    try {
      const res = await makeInboxKey()
      if (res.key) { setKey(res.key); setHasKey(true) }
      else setError(res.error ?? "Couldn't make a key.")
    } catch {
      setError("Couldn't reach the server.")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm("Remove the key? Your Shortcut stops sending slips until you make a new one.")) return
    setBusy(true)
    setError(null)
    try {
      if (await removeInboxKey()) { setHasKey(false); setKey(null) }
      else setError("Couldn't remove the key.")
    } catch {
      setError("Couldn't reach the server.")
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!key) return
    try {
      await navigator.clipboard.writeText(key)
      setCopied(true)
    } catch {
      setError("Couldn't copy. Select the key and copy it yourself.")
    }
  }

  return (
    <section
      aria-labelledby="inbox-key-title"
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: "24px",
        display: "flex", flexDirection: "column", gap: "14px",
      }}
    >
      <h2 id="inbox-key-title" style={{ margin: 0, fontSize: "15px" }}>Slip inbox</h2>
      <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
        The key lets your iPhone Shortcut send bank-app screenshots here. Slips wait in your inbox until you check them.
      </p>

      {key && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label className="field-label" htmlFor="inbox-key">Your key</label>
          <input id="inbox-key" className="field-input" readOnly value={key} onFocus={e => e.currentTarget.select()} />
          <p className="sheet-warn" role="status" style={{ margin: 0 }}>Copy it now. It won&apos;t be shown again.</p>
          <button type="button" onClick={copy}>{copied ? "Copied" : "Copy key"}</button>
        </div>
      )}

      {!key && hasKey && <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>A key is set. It can&apos;t be shown again.</p>}

      {error && <p className="sheet-error" role="alert" style={{ margin: 0 }}>{error}</p>}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" onClick={make} disabled={busy || hasKey === null}>
          {hasKey ? "Make a new key" : "Make key"}
        </button>
        {hasKey && <button type="button" onClick={remove} disabled={busy}>Remove key</button>}
      </div>
    </section>
  )
}
