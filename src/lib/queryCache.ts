// A small in-memory cache for read-only queries that every visitor triggers
// (the world map, place names, country counts). Each server instance keeps
// results for a few minutes, so the database is asked far less often.
// New listings appear on the map within CACHE_MS.

const CACHE_MS = 5 * 60 * 1000
const MAX_ENTRIES = 300

const store = new Map<string, { at: number; value: unknown }>()

export async function cached<T>(key: string, load: () => Promise<T>, maxAgeMs = CACHE_MS): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && now - hit.at < maxAgeMs) return hit.value as T
  const value = await load()
  if (store.size >= MAX_ENTRIES) store.clear()
  store.set(key, { at: now, value })
  return value
}
