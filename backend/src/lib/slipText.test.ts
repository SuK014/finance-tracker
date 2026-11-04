import { test } from "node:test"
import assert from "node:assert/strict"
import { dedupeKeyFor, gregorianYear, parseSlipWithRules, resolveWhen } from "./slipText"

test("Buddhist-era years become Gregorian", () => {
  assert.equal(gregorianYear(2569), 2026)
  assert.equal(gregorianYear(69), 2026)
  assert.equal(gregorianYear(26), 2026)
  assert.equal(gregorianYear(2026), 2026)
})

// Apple's OCR puts the phone's status bar first: this clock must never be taken for the transfer time.
const KBANK = `23:28
5G
21
โอนเงินสำเร็จ
26 ต.ค. 69 14:32 น.
จาก
นาย สมชาย ใจดี
ไปยัง
ร้าน กาแฟดี
จำนวนเงิน
1,250.50 บาท
ค่าธรรมเนียม
0.00 บาท`

test("reads amount, date, the time next to the date, type and receiver from a Thai slip", () => {
  const r = parseSlipWithRules(KBANK)
  assert.equal(r.amount, 1250.5)
  assert.equal(r.day, "2026-10-26")
  assert.equal(r.time, "14:32")
  assert.equal(r.type, "expense")
  assert.equal(r.description, "ร้าน กาแฟดี")
})

test("ignores the status-bar clock when the slip prints no time", () => {
  const r = parseSlipWithRules("23:28\n5G\nโอนเงินสำเร็จ\n26/10/2569\nจำนวนเงิน 85 บาท")
  assert.equal(r.day, "2026-10-26")
  assert.equal(r.time, null)
  assert.equal(r.amount, 85)
})

test("reads Thai digits, dotted times and English month names", () => {
  assert.equal(parseSlipWithRules("๒๖ ต.ค. ๒๕๖๙ ๑๔.๓๒ น.\n฿ 99.00").time, "14:32")
  const r = parseSlipWithRules("Transfer successful\n3 Nov 2026 08:05\nAmount 300.00 THB")
  assert.equal(r.day, "2026-11-03")
  assert.equal(r.time, "08:05")
  assert.equal(r.amount, 300)
})

test("a price like 14.30 baht is not a time", () => {
  const r = parseSlipWithRules("26 ต.ค. 69\n14.30 บาท")
  assert.equal(r.time, null)
  assert.equal(r.amount, 14.3)
})

test("received money is income, and an unclear slip has no type", () => {
  assert.equal(parseSlipWithRules("ได้รับเงิน 500 บาท").type, "income")
  assert.equal(parseSlipWithRules("500 บาท").type, null)
})

test("rejects dates that do not exist", () => {
  assert.equal(parseSlipWithRules("31/02/2569").day, null)
})

test("time: slip first, then the screenshot, then none", () => {
  const takenAt = new Date("2026-10-26T14:50:00+07:00")
  assert.deepEqual(resolveWhen({ day: "2026-10-26", time: "14:32" }, takenAt), { day: "2026-10-26", time: "14:32", timeSource: "slip" })
  assert.deepEqual(resolveWhen({ day: "2026-10-26", time: null }, takenAt), { day: "2026-10-26", time: "14:50", timeSource: "screenshot" })
  assert.deepEqual(resolveWhen({ day: null, time: null }, takenAt), { day: "2026-10-26", time: "14:50", timeSource: "screenshot" })
  // an older slip viewed today: the screenshot's clock says nothing about it
  assert.deepEqual(resolveWhen({ day: "2026-10-20", time: null }, takenAt), { day: "2026-10-20", time: null, timeSource: null })
  assert.deepEqual(resolveWhen({ day: "2026-10-20", time: null }, null), { day: "2026-10-20", time: null, timeSource: null })
})

test("the same screenshot always gets the same key, whatever the whitespace", () => {
  const a = dedupeKeyFor("โอนเงินสำเร็จ  26 ต.ค. 69\n1,250 บาท", null)
  assert.equal(a, dedupeKeyFor("โอนเงินสำเร็จ 26 ต.ค. 69 1,250 บาท", null))
  assert.notEqual(a, dedupeKeyFor("โอนเงินสำเร็จ 27 ต.ค. 69 1,250 บาท", null))
})

test("a text too short to tell slips apart is keyed on the image", () => {
  assert.notEqual(dedupeKeyFor("ok", Buffer.from("one")), dedupeKeyFor("ok", Buffer.from("two")))
})
