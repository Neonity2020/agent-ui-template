import assert from "node:assert/strict"
import test from "node:test"

import { defaultSelection, providerCatalog, selectionForProvider } from "../lib/provider-catalog.ts"

test("provider switching restores a valid remembered model and otherwise uses the default", () => {
  const defaults = defaultSelection(providerCatalog)
  assert.equal(defaults.instanceId, "codex")
  assert.equal(defaults.model, "gpt-5.4")

  assert.deepEqual(selectionForProvider(providerCatalog, "claude-agent", {}), {
    instanceId: "claude-agent",
    model: "claude-opus-4-6",
  })
  assert.deepEqual(
    selectionForProvider(providerCatalog, "claude-agent", {
      "claude-agent": "claude-sonnet-4-6",
    }),
    { instanceId: "claude-agent", model: "claude-sonnet-4-6" },
  )
  assert.deepEqual(selectionForProvider(providerCatalog, "missing", {}), defaults)

  assert.deepEqual(selectionForProvider(providerCatalog, "pi-agent", {}), {
    instanceId: "pi-agent",
    model: "anthropic/claude-sonnet-4-6",
  })
})
