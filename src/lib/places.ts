export type MapPoint = {
  lat: number
  lng: number
}

export type MapProperty = {
  id: number
  title: string
  location: string
  priceLabel: string
  lat: number
  lng: number
  offerCount?: number
}

type NamedPlace = MapPoint & { name: string }

const EXACT: NamedPlace[] = [
  { name: "riverside", lat: 51.461, lng: -0.216 },
  { name: "northside", lat: -33.84, lng: 151.207 },
  { name: "central", lat: -33.87, lng: 151.205 },
]

const CITIES: NamedPlace[] = [
  { name: "george town, penang", lat: 5.4145, lng: 100.3292 },
  { name: "daerah timor laut", lat: 5.4141, lng: 100.3288 },
  { name: "daerah barat daya", lat: 5.283, lng: 100.275 },
  { name: "seberang perai utara", lat: 5.399, lng: 100.365 },
  { name: "seberang perai tengah", lat: 5.363, lng: 100.466 },
  { name: "seberang perai selatan", lat: 5.17, lng: 100.478 },
  { name: "batu pahat", lat: 1.8548, lng: 102.9325 },
  { name: "kota tinggi", lat: 1.7381, lng: 103.8992 },
  { name: "johor bahru", lat: 1.4927, lng: 103.7414 },
  { name: "kuala lumpur", lat: 3.1579, lng: 101.7116 },
  { name: "segamat", lat: 2.5148, lng: 102.8158 },
  { name: "pontian", lat: 1.4866, lng: 103.389 },
  { name: "mersing", lat: 2.4312, lng: 103.8405 },
  { name: "tangkak", lat: 2.2674, lng: 102.545 },
  { name: "kluang", lat: 2.0251, lng: 103.3328 },
  { name: "kulai", lat: 1.6561, lng: 103.6032 },
  { name: "muar", lat: 2.0442, lng: 102.5689 },
  { name: "johor", lat: 1.4927, lng: 103.7414 },
  { name: "tiong bahru", lat: 1.283, lng: 103.832 },
  { name: "bukit timah", lat: 1.3294, lng: 103.8021 },
  { name: "tampines", lat: 1.3496, lng: 103.9568 },
  { name: "chiang mai", lat: 18.7883, lng: 98.9853 },
  { name: "sukhumvit", lat: 13.737, lng: 100.5601 },
  { name: "phuket", lat: 7.8804, lng: 98.3923 },
  { name: "bandung", lat: -6.9175, lng: 107.6191 },
  { name: "seminyak", lat: -8.6913, lng: 115.1682 },
  { name: "surabaya", lat: -7.2575, lng: 112.7521 },
  { name: "cebu city", lat: 10.3157, lng: 123.8854 },
  { name: "makati", lat: 14.5547, lng: 121.0244 },
  { name: "tagaytay", lat: 14.1153, lng: 120.9621 },
  { name: "hoan kiem", lat: 21.0285, lng: 105.8542 },
  { name: "da nang", lat: 16.0544, lng: 108.2022 },
  { name: "can tho", lat: 10.0452, lng: 105.7469 },
  { name: "kennedy town", lat: 22.281, lng: 114.1288 },
  { name: "tai po", lat: 22.4508, lng: 114.1642 },
  { name: "islington", lat: 51.5465, lng: -0.1058 },
  { name: "marchmont", lat: 55.944, lng: -3.198 },
  { name: "harbourside, bristol", lat: 51.449, lng: -2.598 },
  { name: "bourton", lat: 51.885, lng: -1.76 },
  { name: "hyde park, austin", lat: 30.304, lng: -97.728 },
  { name: "park slope", lat: 40.671, lng: -73.977 },
  { name: "ballard", lat: 47.668, lng: -122.384 },
  { name: "edgewater, miami", lat: 25.802, lng: -80.19 },
  { name: "bondi, sydney", lat: -33.891, lng: 151.277 },
  { name: "fremantle", lat: -32.0569, lng: 115.7439 },
  { name: "north hobart", lat: -42.872, lng: 147.316 },
  { name: "nakagyo", lat: 35.0116, lng: 135.7681 },
  { name: "namba", lat: 34.665, lng: 135.501 },
  { name: "sapporo", lat: 43.0618, lng: 141.3545 },
  { name: "dubai marina", lat: 25.0805, lng: 55.1403 },
  { name: "khalifa city", lat: 24.419, lng: 54.576 },
  { name: "al zahia", lat: 25.314, lng: 55.49 },
  { name: "cape town", lat: -33.928, lng: 18.417 },
  { name: "parkhurst", lat: -26.14, lng: 28.018 },
  { name: "umhlanga", lat: -29.725, lng: 31.086 },
  { name: "sydney", lat: -33.8688, lng: 151.2093 },
  { name: "melbourne", lat: -37.8136, lng: 144.9631 },
  { name: "brisbane", lat: -27.4698, lng: 153.0251 },
  { name: "adelaide", lat: -34.9285, lng: 138.6007 },
  { name: "perth", lat: -31.9523, lng: 115.8613 },
  { name: "darwin", lat: -12.4634, lng: 130.8456 },
].sort((a, b) => b.name.length - a.name.length)

const COUNTRIES: NamedPlace[] = [
  { name: "malaysia", lat: 4.2105, lng: 101.9758 },
  { name: "singapore", lat: 1.3521, lng: 103.8198 },
  { name: "thailand", lat: 15.87, lng: 100.9925 },
  { name: "indonesia", lat: -0.7893, lng: 113.9213 },
  { name: "philippines", lat: 12.8797, lng: 121.774 },
  { name: "vietnam", lat: 14.0583, lng: 108.2772 },
  { name: "hong kong", lat: 22.3193, lng: 114.1694 },
  { name: "united kingdom", lat: 54.5, lng: -3 },
  { name: "united states", lat: 39.8, lng: -98.5 },
  { name: "australia", lat: -25.27, lng: 133.77 },
  { name: "japan", lat: 36.2, lng: 138.25 },
  { name: "united arab emirates", lat: 23.42, lng: 53.84 },
  { name: "south africa", lat: -30.56, lng: 22.94 },
].sort((a, b) => b.name.length - a.name.length)

function fallbackPoint(location: string): MapPoint {
  let hash = 0
  for (const char of location) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return {
    lat: ((hash % 10000) / 100) - 50,
    lng: (((hash >>> 8) % 30000) / 100) - 150,
  }
}

function metadataPoint(metadata: string | null): MapPoint | null {
  if (!metadata) return null
  try {
    const parsed = JSON.parse(metadata) as { lat?: unknown; lng?: unknown }
    const lat = typeof parsed.lat === "number" ? parsed.lat : Number(parsed.lat)
    const lng = typeof parsed.lng === "number" ? parsed.lng : Number(parsed.lng)
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180 &&
      !(lat === 0 && lng === 0)
    ) {
      return { lat, lng }
    }
  } catch {
    // The place name still locates the listing.
  }
  return null
}

function namedPlace(location: string): MapPoint | null {
  const key = location.trim().toLocaleLowerCase()
  const exact = EXACT.find((place) => place.name === key)
  if (exact) return exact
  const town = key.split(",")[0]?.trim() ?? ""
  const townMatch = CITIES.find((place) => place.name === town)
  if (townMatch) return townMatch
  return CITIES.find((place) => key.includes(place.name)) ?? null
}

export function picturePoint(location: string, metadata: string | null): (MapPoint & { precise: boolean }) | null {
  const placed = metadataPoint(metadata)
  if (placed) return { ...placed, precise: true }
  const named = namedPlace(location)
  if (named) return { ...named, precise: false }
  return null
}

export function pointForListing(location: string, metadata: string | null): MapPoint {
  return picturePoint(location, metadata) ?? placePoint(location)
}

export function placePoint(location: string): MapPoint {
  const key = location.trim().toLocaleLowerCase()
  const exact = EXACT.find((place) => place.name === key)
  if (exact) return { lat: exact.lat, lng: exact.lng }
  const city = CITIES.find((place) => key.includes(place.name))
  if (city) return { lat: city.lat, lng: city.lng }
  const country = COUNTRIES.find((place) => key.includes(place.name))
  if (country) return { lat: country.lat, lng: country.lng }
  return fallbackPoint(key || "unknown")
}

export function spreadPoints(points: MapProperty[]): MapProperty[] {
  const seen = new Map<string, number>()
  return points.map((point) => {
    const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`
    const index = seen.get(key) ?? 0
    seen.set(key, index + 1)
    if (index === 0) return point
    const ring = Math.ceil(index / 6)
    const angle = (index * 50 * Math.PI) / 180
    return {
      ...point,
      lat: point.lat + Math.sin(angle) * ring * 0.02,
      lng: point.lng + Math.cos(angle) * ring * 0.02,
    }
  })
}
