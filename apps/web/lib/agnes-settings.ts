export type AgnesSettings = {
  apiKey: string
  baseUrl: string
  model: string
}

export const AGNES_DEFAULT_BASE_URL = "https://apihub.agnes-ai.com/v1"

export const AGNES_MODELS = [
  { id: "agnes-2.5-flash", name: "Agnes 2.5 Flash", description: "Recommended — coding, agent workflows, tool use" },
  { id: "agnes-2.0-flash", name: "Agnes 2.0 Flash", description: "Previous generation, API compatible" },
] as const

const STORAGE_KEY = "agnes-settings"

export function defaultSettings(): AgnesSettings {
  return { apiKey: "", baseUrl: AGNES_DEFAULT_BASE_URL, model: "agnes-2.5-flash" }
}

export function loadSettings(): AgnesSettings {
  if (typeof window === "undefined") return defaultSettings()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw) as Partial<AgnesSettings>
    return { ...defaultSettings(), ...parsed }
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings: AgnesSettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function clearSettings() {
  window.localStorage.removeItem(STORAGE_KEY)
}

// --- Reactive store for useSyncExternalStore ---

let cached: AgnesSettings | null = null
const listeners = new Set<() => void>()

// The server and the first client (hydration) render must agree on the
// snapshot, otherwise React reports a hydration mismatch. We render the
// server-safe default until the client has mounted, then switch to the real
// stored settings.
const serverSnapshot: AgnesSettings = defaultSettings()
let hydrated = false

function notify() {
  listeners.forEach((listener) => listener())
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSettingsSnapshot(): AgnesSettings {
  // Stable references are required by useSyncExternalStore: same value, same
  // object identity, otherwise it loops forever.
  if (!hydrated) return serverSnapshot
  if (!cached) cached = loadSettings()
  return cached
}

/** Call once after mount to switch the snapshot to the stored settings. */
export function markSettingsHydrated() {
  if (hydrated) return
  hydrated = true
  notify()
}

export function updateSettings(next: AgnesSettings) {
  cached = next
  saveSettings(next)
  notify()
}
