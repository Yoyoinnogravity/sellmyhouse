import { listingTypeChoice, type ListingSearch } from "@/lib/listingSearch"

// Searching beyond our own stock. Two layers:
//
// 1. Live web results. Uses Google Programmable Search when GOOGLE_CSE_KEY and
//    GOOGLE_CSE_ID are set (make the engine search the whole web, or a list of
//    property portals), otherwise Brave Search when BRAVE_SEARCH_KEY is set.
//    Results are cached in memory for an hour so quota is not spent twice on
//    the same search.
//
// 2. Portal searches. Hand-picked property portals by country, each opened as
//    a web search scoped to that portal. Needs no key, never breaks when a
//    portal changes its URL scheme, and is honest about where the visitor is
//    going.

export type WebResult = {
  title: string
  url: string
  host: string
  snippet: string
  image: string | null
}

export type Portal = { name: string; host: string }

export type InternetResults = {
  query: string
  provider: "google" | "brave" | null
  results: WebResult[]
}

const CACHE_TTL_MS = 60 * 60 * 1000
const cache = new Map<string, { at: number; value: InternetResults }>()

export function internetQuery(search: ListingSearch): string {
  const type = search.type ? listingTypeChoice(search.type) : null
  const what = type ? type.plural : "property"
  return `${search.place.trim()} ${what} for sale`.trim()
}

export async function searchInternet(search: ListingSearch): Promise<InternetResults> {
  const query = internetQuery(search)
  if (!search.place.trim()) return { query, provider: null, results: [] }
  const key = query.toLowerCase()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value

  let value: InternetResults = { query, provider: null, results: [] }
  try {
    const googleKey = (process.env.GOOGLE_CSE_KEY ?? "").trim()
    const googleId = (process.env.GOOGLE_CSE_ID ?? "").trim()
    const braveKey = (process.env.BRAVE_SEARCH_KEY ?? "").trim()
    if (googleKey && googleId) {
      value = { query, provider: "google", results: await googleResults(query, googleKey, googleId) }
    } else if (braveKey) {
      value = { query, provider: "brave", results: await braveResults(query, braveKey) }
    }
  } catch (error) {
    console.error(`[internet search] ${query}: ${String(error)}`)
  }
  if (value.provider) cache.set(key, { at: Date.now(), value })
  return value
}

async function googleResults(query: string, key: string, cx: string): Promise<WebResult[]> {
  const url = new URL("https://www.googleapis.com/customsearch/v1")
  url.searchParams.set("key", key)
  url.searchParams.set("cx", cx)
  url.searchParams.set("q", query)
  url.searchParams.set("num", "10")
  url.searchParams.set("safe", "active")
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) })
  if (!response.ok) throw new Error(`google ${response.status}`)
  const data = (await response.json()) as {
    items?: {
      title?: string
      link?: string
      snippet?: string
      displayLink?: string
      pagemap?: { cse_thumbnail?: { src?: string }[]; cse_image?: { src?: string }[] }
    }[]
  }
  return (data.items ?? [])
    .filter((item) => item.link && item.title)
    .map((item) => ({
      title: item.title as string,
      url: item.link as string,
      host: item.displayLink ?? hostOf(item.link as string),
      snippet: item.snippet ?? "",
      image: item.pagemap?.cse_thumbnail?.[0]?.src ?? item.pagemap?.cse_image?.[0]?.src ?? null,
    }))
}

async function braveResults(query: string, key: string): Promise<WebResult[]> {
  const url = new URL("https://api.search.brave.com/res/v1/web/search")
  url.searchParams.set("q", query)
  url.searchParams.set("count", "10")
  url.searchParams.set("safesearch", "moderate")
  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": key },
    signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) throw new Error(`brave ${response.status}`)
  const data = (await response.json()) as {
    web?: { results?: { title?: string; url?: string; description?: string; thumbnail?: { src?: string } }[] }
  }
  return (data.web?.results ?? [])
    .filter((item) => item.url && item.title)
    .map((item) => ({
      title: item.title as string,
      url: item.url as string,
      host: hostOf(item.url as string),
      snippet: item.description ?? "",
      image: item.thumbnail?.src ?? null,
    }))
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

// Portals by country. Keys are lower-case words looked for in the place text.
const portalsByCountry: { match: string[]; country: string; portals: Portal[] }[] = [
  {
    match: ["malaysia", "kuala lumpur", "johor", "penang", "selangor", "melaka", "sabah", "sarawak", "ipoh", "kota kinabalu", "kuching"],
    country: "Malaysia",
    portals: [
      { name: "PropertyGuru", host: "propertyguru.com.my" },
      { name: "iProperty", host: "iproperty.com.my" },
      { name: "Mudah", host: "mudah.my" },
      { name: "EdgeProp", host: "edgeprop.my" },
    ],
  },
  {
    match: ["singapore"],
    country: "Singapore",
    portals: [
      { name: "PropertyGuru", host: "propertyguru.com.sg" },
      { name: "99.co", host: "99.co" },
      { name: "EdgeProp", host: "edgeprop.sg" },
    ],
  },
  {
    match: ["united kingdom", "uk", "england", "scotland", "wales", "london", "manchester", "birmingham", "edinburgh", "bristol", "cardiff", "bourton"],
    country: "United Kingdom",
    portals: [
      { name: "Rightmove", host: "rightmove.co.uk" },
      { name: "Zoopla", host: "zoopla.co.uk" },
      { name: "OnTheMarket", host: "onthemarket.com" },
    ],
  },
  {
    match: ["australia", "sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra", "hobart", "gold coast"],
    country: "Australia",
    portals: [
      { name: "realestate.com.au", host: "realestate.com.au" },
      { name: "Domain", host: "domain.com.au" },
    ],
  },
  {
    match: ["united states", "usa", "new york", "los angeles", "california", "texas", "florida", "seattle", "brooklyn", "chicago", "riverside", "ballard"],
    country: "United States",
    portals: [
      { name: "Zillow", host: "zillow.com" },
      { name: "Realtor.com", host: "realtor.com" },
      { name: "Redfin", host: "redfin.com" },
    ],
  },
  {
    match: ["japan", "tokyo", "osaka", "kyoto", "sapporo", "fukuoka", "nagoya"],
    country: "Japan",
    portals: [
      { name: "SUUMO", host: "suumo.jp" },
      { name: "Real Estate Japan", host: "realestate.co.jp" },
      { name: "LIFULL HOME'S", host: "homes.co.jp" },
    ],
  },
  {
    match: ["united arab emirates", "uae", "dubai", "abu dhabi", "sharjah", "al zahia"],
    country: "United Arab Emirates",
    portals: [
      { name: "Bayut", host: "bayut.com" },
      { name: "Property Finder", host: "propertyfinder.ae" },
      { name: "Dubizzle", host: "dubizzle.com" },
    ],
  },
  {
    match: ["thailand", "bangkok", "phuket", "chiang mai", "pattaya"],
    country: "Thailand",
    portals: [
      { name: "DDproperty", host: "ddproperty.com" },
      { name: "FazWaz", host: "fazwaz.com" },
      { name: "Hipflat", host: "hipflat.co.th" },
    ],
  },
  {
    match: ["indonesia", "jakarta", "bali", "bandung", "surabaya"],
    country: "Indonesia",
    portals: [
      { name: "Rumah123", host: "rumah123.com" },
      { name: "Lamudi", host: "lamudi.co.id" },
      { name: "99.co Indonesia", host: "99.co/id" },
    ],
  },
  {
    match: ["philippines", "manila", "cebu", "davao", "makati"],
    country: "Philippines",
    portals: [
      { name: "Lamudi", host: "lamudi.com.ph" },
      { name: "Dot Property", host: "dotproperty.com.ph" },
    ],
  },
  {
    match: ["vietnam", "hanoi", "ho chi minh", "saigon", "da nang", "can tho"],
    country: "Vietnam",
    portals: [
      { name: "Batdongsan", host: "batdongsan.com.vn" },
      { name: "Nhatot", host: "nhatot.com" },
    ],
  },
  {
    match: ["hong kong"],
    country: "Hong Kong",
    portals: [
      { name: "Squarefoot", host: "squarefoot.com.hk" },
      { name: "28Hse", host: "28hse.com" },
      { name: "Spacious", host: "spacious.hk" },
    ],
  },
  {
    match: ["south africa", "cape town", "johannesburg", "durban", "pretoria"],
    country: "South Africa",
    portals: [
      { name: "Property24", host: "property24.com" },
      { name: "Private Property", host: "privateproperty.co.za" },
    ],
  },
  {
    match: ["spain", "madrid", "barcelona", "valencia", "malaga", "portugal", "lisbon", "porto", "italy", "rome", "milan"],
    country: "Southern Europe",
    portals: [
      { name: "Idealista", host: "idealista.com" },
      { name: "Immobiliare.it", host: "immobiliare.it" },
      { name: "Kyero", host: "kyero.com" },
    ],
  },
  {
    match: ["france", "paris", "lyon", "nice", "germany", "berlin", "munich", "hamburg"],
    country: "France and Germany",
    portals: [
      { name: "SeLoger", host: "seloger.com" },
      { name: "ImmoScout24", host: "immobilienscout24.de" },
    ],
  },
  {
    match: ["india", "mumbai", "delhi", "bangalore", "bengaluru", "chennai", "hyderabad", "pune"],
    country: "India",
    portals: [
      { name: "99acres", host: "99acres.com" },
      { name: "MagicBricks", host: "magicbricks.com" },
      { name: "Housing.com", host: "housing.com" },
    ],
  },
]

const worldPortals: Portal[] = [
  { name: "Rightmove Overseas", host: "rightmove.co.uk/overseas-property" },
  { name: "Properstar", host: "properstar.com" },
  { name: "JamesEdition", host: "jamesedition.com" },
  { name: "Realtor.com International", host: "realtor.com/international" },
  { name: "Green-Acres", host: "green-acres.com" },
]

export function portalsFor(place: string): { country: string; portals: Portal[] }[] {
  const text = place.toLowerCase()
  const matched = portalsByCountry.filter((entry) => entry.match.some((word) => text.includes(word)))
  const groups = matched.map((entry) => ({ country: entry.country, portals: entry.portals }))
  groups.push({ country: "Worldwide", portals: worldPortals })
  return groups
}

export function portalSearchUrl(portal: Portal, query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} site:${portal.host}`)}`
}

export function webSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
