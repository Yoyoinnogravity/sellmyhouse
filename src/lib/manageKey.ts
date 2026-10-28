import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

// Sellers list without an account, so each listing gets a secret "manage"
// key instead. Only a SHA-256 hash of the key is stored, inside the
// listing's metadata, so nothing in the database can be turned back into a
// working link. The seller keeps the key in their private link.

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex")
}

export function newManageKey() {
  // 12 characters (72 random bits): short enough to read out or type,
  // far too many combinations to guess.
  const key = randomBytes(9).toString("base64url")
  return { key, hash: hashKey(key) }
}

function storedHash(metadata: string | null): string | null {
  if (!metadata) return null
  try {
    const parsed = JSON.parse(metadata) as { manageHash?: unknown }
    return typeof parsed.manageHash === "string" && /^[a-f0-9]{64}$/.test(parsed.manageHash)
      ? parsed.manageHash
      : null
  } catch {
    return null
  }
}

export function manageKeyMatches(metadata: string | null, key: unknown): boolean {
  const stored = storedHash(metadata)
  if (!stored || typeof key !== "string" || key.length < 10 || key.length > 100) return false
  const a = Buffer.from(stored, "hex")
  const b = Buffer.from(hashKey(key), "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}

export function withManageHash(metadata: string | null, hash: string): string {
  let parsed: Record<string, unknown> = {}
  if (metadata) {
    try {
      parsed = JSON.parse(metadata) as Record<string, unknown>
    } catch {
      parsed = {}
    }
  }
  return JSON.stringify({ ...parsed, manageHash: hash })
}
