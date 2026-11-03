import assert from "node:assert/strict"
import test from "node:test"
import { UAT_PERSONAS, demoPersona, matchesUatPersona } from "./uatPersona"

test("all UAT tasks are assigned to their demo personas", () => {
  assert.deepEqual(Object.keys(UAT_PERSONAS), Array.from({ length: 11 }, (_, i) => `UAT-${String(i + 1).padStart(2, "0")}`))
  assert.equal(UAT_PERSONAS["UAT-08"], "Grace")
  assert.equal(demoPersona("grace@demo.budgetbuddy.test"), "Grace")
  assert.equal(matchesUatPersona("UAT-08", "grace@demo.budgetbuddy.test"), true)
  assert.equal(matchesUatPersona("UAT-08", "henry@demo.budgetbuddy.test"), false)
  assert.equal(matchesUatPersona("UAT-08", "other@example.com"), false)
})
