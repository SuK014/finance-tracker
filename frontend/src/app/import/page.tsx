"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { extractSlips, getAccounts, getCategories, createTransaction } from "@/lib/api"
import Select from "@/components/Select"
import DatePicker from "@/components/DatePicker"
import TimePicker from "@/components/TimePicker"

type Row = {
  filename: string
  preview: string
  amount: string
  type: string
  date: string
  description: string
  accountId: string
  categoryId: string
  error?: string
}

type CsvRow = {
  date: string
  description: string
  amount: string
  type: string
  accountId: string
  categoryId: string
  raw: string
}

// ── CSV parser ───────────────────────────────────────────────────────────────

function detectDelimiter(line: string): string {
  const counts = { ",": 0, ";": 0, "\t": 0 }
  for (const ch of line) {
    if (ch in counts) counts[ch as keyof typeof counts]++
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function parseCsvLine(line: string, delim: string): string[] {
  const cells: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === delim && !inQ) {
      cells.push(cur.trim()); cur = ""
    } else {
      cur += ch
    }
  }
  cells.push(cur.trim())
  return cells
}

function normaliseDate(raw: string): string {
  // Handles: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY
  const s = raw.trim()
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2,"0")}-${iso[3].padStart(2,"0")}`
  const dmy = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/)
  if (dmy) {
    const y = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    // Thai Buddhist year fix: if year > 2100 assume it's Buddhist era
    const yr = Number(y) > 2100 ? Number(y) - 543 : Number(y)
    return `${yr}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`
  }
  return s
}

const AMOUNT_COLS   = ["amount","debit","credit","withdrawal","deposit","จำนวนเงิน","เดบิต","เครดิต"]
const DATE_COLS     = ["date","วันที่","datetime","transaction date","txn date"]
const DESC_COLS     = ["description","remark","note","narration","details","รายการ","รายละเอียด","หมายเหตุ"]

function findCol(headers: string[], names: string[]): number {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const n of names) {
    const i = lower.findIndex(h => h.includes(n))
    if (i >= 0) return i
  }
  return -1
}

function parseBankCsv(text: string): Array<{ date: string; description: string; amount: string; type: string }> {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const delim = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delim)

  const dateIdx  = findCol(headers, DATE_COLS)
  const descIdx  = findCol(headers, DESC_COLS)
  const amtIdx   = findCol(headers, AMOUNT_COLS)

  // Check for separate debit/credit columns (common in Thai banks)
  const debitIdx  = headers.findIndex(h => /debit|withdrawal|เดบิต/i.test(h))
  const creditIdx = headers.findIndex(h => /credit|deposit|เครดิต/i.test(h))

  return lines.slice(1).flatMap(line => {
    const cells = parseCsvLine(line, delim)
    if (cells.every(c => !c)) return []

    let amount = ""
    let type   = "expense"

    if (debitIdx >= 0 && creditIdx >= 0) {
      const debit  = cells[debitIdx]?.replace(/[^0-9.]/g, "") ?? ""
      const credit = cells[creditIdx]?.replace(/[^0-9.]/g, "") ?? ""
      if (credit && Number(credit) > 0) { amount = credit; type = "income" }
      else if (debit && Number(debit) > 0) { amount = debit; type = "expense" }
    } else if (amtIdx >= 0) {
      const raw = cells[amtIdx]?.replace(/[^0-9.\-]/g, "") ?? ""
      const n = Number(raw)
      amount = String(Math.abs(n))
      type   = n >= 0 ? "income" : "expense"
    }

    if (!amount || amount === "0") return []

    return [{
      date:        dateIdx >= 0 ? normaliseDate(cells[dateIdx] ?? "") : "",
      description: descIdx >= 0 ? (cells[descIdx] ?? "") : "",
      amount,
      type,
    }]
  })
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const router = useRouter()
  const slipRef = useRef<HTMLInputElement>(null)
  const csvRef  = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<"slip"|"csv">("slip")
  const [rows, setRows]         = useState<Row[]>([])
  const [csvRows, setCsvRows]   = useState<CsvRow[]>([])
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string; type?: string }[]>([])

  // ── Slip tab ──
  async function handleSlipFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setExtracting(true)
    const fileArray = Array.from(files)
    const previews  = fileArray.map(f => URL.createObjectURL(f))
    const [results, accs, cats] = await Promise.all([
      extractSlips(fileArray), getAccounts(), getCategories(),
    ])
    setAccounts(accs); setCategories(cats)
    setRows(results.map((r, i) => ({
      filename: r.filename, preview: previews[i],
      amount: r.data?.amount != null ? String(r.data.amount) : "",
      type:   r.data?.type ?? "expense",
      date:   r.data?.date ? r.data.date.slice(0, 16) : "",
      description: r.data?.description ?? "",
      accountId: String(accs[0]?.id ?? ""), categoryId: "",
      error: r.success ? undefined : r.error,
    })))
    setExtracting(false)
  }

  // ── CSV tab ──
  async function handleCsvFile(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    const text = await file.text()
    const parsed = parseBankCsv(text)
    const [accs, cats] = await Promise.all([getAccounts(), getCategories()])
    setAccounts(accs); setCategories(cats)
    setCsvRows(parsed.map(p => ({
      ...p,
      accountId: String(accs[0]?.id ?? ""),
      categoryId: "",
      raw: "",
    })))
  }

  function updateSlip(i: number, field: keyof Row, value: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }
  function updateCsv(i: number, field: keyof CsvRow, value: string) {
    setCsvRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  async function handleSaveSlips() {
    setSaving(true)
    await Promise.all(
      rows.filter(r => !r.error && r.amount && r.accountId).map(r =>
        createTransaction({
          amount: Number(r.amount), type: r.type,
          date: r.date || new Date().toISOString(),
          description: r.description,
          accountId: Number(r.accountId),
          categoryId: r.categoryId ? Number(r.categoryId) : undefined,
        })
      )
    )
    setSaving(false)
    router.push("/transactions")
  }

  async function handleSaveCsv() {
    setSaving(true)
    await Promise.all(
      csvRows.filter(r => r.amount && r.accountId).map(r =>
        createTransaction({
          amount: Number(r.amount), type: r.type,
          date: r.date || new Date().toISOString(),
          description: r.description,
          accountId: Number(r.accountId),
          categoryId: r.categoryId ? Number(r.categoryId) : undefined,
        })
      )
    )
    setSaving(false)
    router.push("/transactions")
  }

  const tabBtn = (t: "slip"|"csv"): React.CSSProperties => ({
    border: "none", borderRadius: 0, padding: "8px 20px", fontWeight: tab === t ? 600 : 400,
    background: "transparent", borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
    color: tab === t ? "var(--accent)" : "var(--text-secondary)", cursor: "pointer",
  })

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <h1 style={{ margin: 0 }}>Import Transactions</h1>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: 0 }}>
        <button style={tabBtn("slip")} onClick={() => setTab("slip")}>E-Slip (AI)</button>
        <button style={tabBtn("csv")}  onClick={() => setTab("csv")}>Bank CSV</button>
      </div>

      {/* ── Slip tab ── */}
      {tab === "slip" && (
        <div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px", marginTop: 0 }}>
            Upload Thai bank e-slip images. Claude reads the amount, date, and description automatically.
          </p>
          <input ref={slipRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={e => handleSlipFiles(e.target.files)} />
          <button onClick={() => slipRef.current?.click()} disabled={extracting}>
            {extracting ? "Reading slips…" : "Choose images"}
          </button>

          {rows.length > 0 && (
            <>
              <div style={{ overflowX: "auto", marginTop: "16px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                      {["Slip","Amount","Type","Date","Description","Account","Category"].map(h => (
                        <th key={h} scope="col" style={{ padding: "6px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "6px 8px" }}>
                          <img src={row.preview} alt={row.filename} style={{ width: "50px", height: "66px", objectFit: "cover", borderRadius: "4px" }} />
                          {row.error && <p style={{ color: "var(--expense)", fontSize: "11px", margin: "2px 0 0" }}>Parse failed</p>}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>
                          <input type="number" step="any" min="0" value={row.amount} disabled={!!row.error}
                            onChange={e => updateSlip(i, "amount", e.target.value)} style={{ width: "80px", textAlign: "right" }} />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <div style={{ width: "100px" }}>
                            <Select
                              ariaLabel="Type"
                              value={row.type}
                              disabled={!!row.error}
                              onChange={v => updateSlip(i, "type", v)}
                              options={[
                                { value: "expense", label: "Expense" },
                                { value: "income", label: "Income" },
                              ]}
                            />
                          </div>
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <div style={{ display: "flex", gap: "4px", width: "220px" }}>
                            <DatePicker
                              value={row.date.slice(0, 10)}
                              onChange={date => updateSlip(i, "date", `${date}T${row.date.slice(11, 16) || "00:00"}`)}
                            />
                            <TimePicker
                              value={row.date.slice(11, 16)}
                              onChange={time => updateSlip(i, "date", `${row.date.slice(0, 10)}T${time}`)}
                            />
                          </div>
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <input type="text" value={row.description} disabled={!!row.error}
                            onChange={e => updateSlip(i, "description", e.target.value)} />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <div style={{ width: "130px" }}>
                            <Select
                              ariaLabel="Account"
                              value={row.accountId}
                              disabled={!!row.error}
                              onChange={v => updateSlip(i, "accountId", v)}
                              options={accounts.map((a: any) => ({ value: String(a.id), label: a.name }))}
                            />
                          </div>
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <div style={{ width: "150px" }}>
                            <Select
                              ariaLabel="Category"
                              value={row.categoryId}
                              disabled={!!row.error}
                              onChange={v => updateSlip(i, "categoryId", v)}
                              options={[
                                { value: "", label: "None" },
                                ...categories.filter((c: any) => c.type === row.type).map((c: any) => ({ value: String(c.id), label: c.name })),
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleSaveSlips} disabled={saving} style={{ marginTop: "16px" }}>
                {saving ? "Saving…" : `Save ${rows.filter(r => !r.error).length} transaction(s)`}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── CSV tab ── */}
      {tab === "csv" && (
        <div>
          <p style={{ color: "var(--text-secondary)", marginBottom: "4px", marginTop: 0 }}>
            Upload a CSV exported from your bank. Columns are auto-detected.
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "16px", marginTop: 0 }}>
            Supported formats: Kbank, SCB, Bangkok Bank, or any CSV with Date / Description / Amount (or Debit + Credit) columns.
          </p>
          <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display: "none" }}
            onChange={e => handleCsvFile(e.target.files)} />
          <button onClick={() => csvRef.current?.click()}>Choose CSV file</button>

          {csvRows.length > 0 && (
            <>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "12px 0 8px" }}>
                {csvRows.length} rows detected — review then save.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                      {["Date","Description","Amount","Type","Account","Category"].map(h => (
                        <th key={h} scope="col" style={{ padding: "6px 8px", fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600, textAlign: h === "Amount" ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "6px 8px" }}>
                          <div style={{ width: "130px" }}>
                            <DatePicker value={row.date} onChange={date => updateCsv(i, "date", date)} />
                          </div>
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <input type="text" value={row.description} onChange={e => updateCsv(i, "description", e.target.value)} />
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>
                          <input type="number" step="any" min="0" value={row.amount} onChange={e => updateCsv(i, "amount", e.target.value)} style={{ width: "80px", textAlign: "right" }} />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <div style={{ width: "100px" }}>
                            <Select
                              ariaLabel="Type"
                              value={row.type}
                              onChange={v => updateCsv(i, "type", v)}
                              options={[
                                { value: "expense", label: "Expense" },
                                { value: "income", label: "Income" },
                              ]}
                            />
                          </div>
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <div style={{ width: "130px" }}>
                            <Select
                              ariaLabel="Account"
                              value={row.accountId}
                              onChange={v => updateCsv(i, "accountId", v)}
                              options={accounts.map((a: any) => ({ value: String(a.id), label: a.name }))}
                            />
                          </div>
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <div style={{ width: "150px" }}>
                            <Select
                              ariaLabel="Category"
                              value={row.categoryId}
                              onChange={v => updateCsv(i, "categoryId", v)}
                              options={[
                                { value: "", label: "None" },
                                ...categories.filter((c: any) => c.type === row.type).map((c: any) => ({ value: String(c.id), label: c.name })),
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleSaveCsv} disabled={saving} style={{ marginTop: "16px" }}>
                {saving ? "Saving…" : `Save ${csvRows.length} transaction(s)`}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  )
}
