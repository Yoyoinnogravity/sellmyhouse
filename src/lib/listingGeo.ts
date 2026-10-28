import { prisma } from "@/lib/prisma"
import { cached } from "@/lib/queryCache"

// The map needs only each listing's pin and, for developments, its project
// code (so unit types share one pin). Reading those few values in SQL keeps
// the full metadata of thousands of listings from crossing the network on
// every map refresh, which is what used up the database's transfer quota.

export type GeoEntry = { lat: number | null; lng: number | null; code: string | null }

const GEO_CACHE_MS = 15 * 60 * 1000

export async function geoIndex(): Promise<Map<number, GeoEntry>> {
  type Row = { id: number; lat: string | null; lng: string | null; code: string | null }
  const rows = await cached(
    "geo-index",
    async () => {
      try {
        return await prisma.$queryRaw<Row[]>`
          SELECT id,
                 metadata::jsonb->>'lat' AS lat,
                 metadata::jsonb->>'lng' AS lng,
                 CASE WHEN metadata::jsonb->>'register' = 'TEDUH' THEN metadata::jsonb->>'projectCode' END AS code
          FROM "Property"
          WHERE metadata IS NOT NULL AND pg_input_is_valid(metadata, 'jsonb')`
      } catch {
        // Postgres before 16 has no pg_input_is_valid: read the pin with patterns instead.
        return await prisma.$queryRaw<Row[]>`
          SELECT id,
                 substring(metadata from '"lat":(-?[0-9.]+)') AS lat,
                 substring(metadata from '"lng":(-?[0-9.]+)') AS lng,
                 CASE WHEN metadata LIKE '%"register":"TEDUH"%' THEN substring(metadata from '"projectCode":"([^"]+)"') END AS code
          FROM "Property"
          WHERE metadata IS NOT NULL`
      }
    },
    GEO_CACHE_MS,
  )
  const index = new Map<number, GeoEntry>()
  for (const row of rows) {
    const lat = row.lat == null ? null : Number(row.lat)
    const lng = row.lng == null ? null : Number(row.lng)
    index.set(row.id, {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      code: row.code,
    })
  }
  return index
}

// A tiny stand-in for the metadata, holding just the pin, for the existing
// place helpers (pointForListing, picturePoint).
export function pinMetadata(entry: GeoEntry | undefined): string | null {
  return entry && entry.lat != null && entry.lng != null ? JSON.stringify({ lat: entry.lat, lng: entry.lng }) : null
}
