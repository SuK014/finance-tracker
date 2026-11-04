import { test } from "node:test"
import assert from "node:assert/strict"
import { bankCode, matchAccount } from "./bankMatch"

test("short codes, full English names and Thai names reach the same code", () => {
  for (const text of ["kbank", "KBank", "Kasikorn", "Kasikorn Bank (Savings)", "กสิกรไทย", "ธนาคารกสิกรไทย"]) assert.equal(bankCode(text), "kbank", text)
  for (const text of ["SCB", "scb easy", "Siam Commercial Bank", "ไทยพาณิชย์"]) assert.equal(bankCode(text), "scb", text)
  assert.equal(bankCode("Krungthai"), "ktb")
  assert.equal(bankCode("กรุงศรี"), "bay")
  assert.equal(bankCode("ttb"), "ttb")
})

test("a short code only counts as a whole word", () => {
  assert.equal(bankCode("Bayside Credit Union"), null)
  assert.equal(bankCode("Cash"), null)
  assert.equal(bankCode(null), null)
})

const accounts = [
  { id: 1, name: "Main", bankName: "Kasikorn" },
  { id: 2, name: "Salary", bankName: "SCB" },
  { id: 3, name: "Wallet", bankName: null },
]

test("the account whose bank name fits is chosen", () => {
  assert.equal(matchAccount("kbank", accounts), 1)
  assert.equal(matchAccount("SCB", accounts), 2)
  assert.equal(matchAccount("ไทยพาณิชย์", accounts), 2)
})

test("two accounts at the same bank are not guessed between", () => {
  const two = [...accounts, { id: 4, name: "Savings", bankName: "KBank" }]
  assert.equal(matchAccount("kbank", two), null)
})

test("no bank, an unknown bank or no fit gives no suggestion", () => {
  assert.equal(matchAccount(null, accounts), null)
  assert.equal(matchAccount("  ", accounts), null)
  assert.equal(matchAccount("ktb", accounts), null)
})

test("a bank we don't know still matches by exact text", () => {
  const custom = [{ id: 9, name: "Dime", bankName: "Dime!" }]
  assert.equal(matchAccount("dime", custom), 9)
  assert.equal(matchAccount("other", custom), null)
})

test("the bank can be in the account's name when its bank name is empty", () => {
  assert.equal(matchAccount("kbank", [{ id: 5, name: "KBank main", bankName: null }]), 5)
})
