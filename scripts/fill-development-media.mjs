import Database from "better-sqlite3"

const db = new Database("prisma/dev.db")
db.pragma("busy_timeout = 30000")

const SKIP_IMAGE = /logo|icon|favicon|sprite|badge|button|arrow|social|facebook|instagram|whatsapp|pixel|spacer|blank|emoji|avatar|spinner|loader|payment|visa|mastercard/i
const BROAD_PLACES = new Set([
  "kuala lumpur",
  "wp kuala lumpur",
  "selangor",
  "johor",
  "johor bahru",
  "penang",
  "pulau pinang",
  "george town",
  "kedah",
  "kelantan",
  "melaka",
  "malacca",
  "negeri sembilan",
  "pahang",
  "perak",
  "perlis",
  "terengganu",
  "putrajaya",
  "malaysia",
])
const STOP_WORDS = new Set(["sdn", "bhd", "bed", "the", "and", "for", "block", "tower", "phase", "with", "from", "unit", "type"])
const GENERIC_WORDS = new Set(["taman", "jaya", "perdana", "residence", "residensi", "condo", "condominium", "avenue", "mutiara", "utama", "raya", "besar", "baru", "indah", "heights", "hill", "hills", "park", "central", "sentral", "villa", "harmoni", "idaman", "impian"])

const locationQueue = db.prepare(`
  SELECT json_extract(metadata, '$.projectCode') AS code,
         min(title) AS title,
         min(location) AS location,
         min(propertyType) AS propertyType
  FROM Property
  WHERE json_extract(metadata, '$.register') = 'TEDUH'
    AND json_extract(metadata, '$.geoChecked') IS NULL
    AND (
      json_extract(metadata, '$.lat') IS NULL
      OR CAST(json_extract(metadata, '$.lat') AS REAL) = 0
      OR CAST(json_extract(metadata, '$.lng') AS REAL) = 0
      OR CAST(json_extract(metadata, '$.lat') AS REAL) NOT BETWEEN 0.8 AND 7.6
      OR CAST(json_extract(metadata, '$.lng') AS REAL) NOT BETWEEN 99 AND 119.5
    )
  GROUP BY code
`)

const mediaQueue = db.prepare(`
  SELECT json_extract(metadata, '$.projectCode') AS code,
         json_extract(metadata, '$.website') AS website,
         min(title) AS title,
         min(propertyType) AS propertyType
  FROM Property
  WHERE json_extract(metadata, '$.register') = 'TEDUH'
    AND json_extract(metadata, '$.mediaChecked') IS NULL
    AND json_extract(metadata, '$.website') != ''
  GROUP BY code
`)

const saveLocation = db.prepare(`
  UPDATE Property
  SET metadata = json_set(metadata, '$.lat', @lat, '$.lng', @lng, '$.geoChecked', 1)
  WHERE json_extract(metadata, '$.projectCode') = @code
    AND json_extract(metadata, '$.register') = 'TEDUH'
`)

const markLocationTried = db.prepare(`
  UPDATE Property
  SET metadata = json_set(metadata, '$.geoChecked', 1)
  WHERE json_extract(metadata, '$.projectCode') = @code
    AND json_extract(metadata, '$.register') = 'TEDUH'
`)

const saveMedia = db.prepare(`
  UPDATE Property
  SET image = CASE WHEN @image != '' THEN @image ELSE image END,
      images = CASE WHEN @images != '' THEN @images ELSE images END,
      metadata = json_set(metadata, '$.videos', json(@videos), '$.mediaChecked', 1)
  WHERE json_extract(metadata, '$.projectCode') = @code
    AND json_extract(metadata, '$.register') = 'TEDUH'
`)

let nextGeo = 0
const mediaFailures = new Map()

function developmentName(title, code, propertyType) {
  let name = String(title || "").trim()
  if (code && name.endsWith(code)) name = name.slice(0, -code.length).trim()
  name = name.replace(/\s+\d+\s+bed$/i, "").trim()
  if (propertyType && name.toLowerCase().endsWith(String(propertyType).toLowerCase())) {
    name = name.slice(0, -propertyType.length).trim()
  }
  return name.replace(/[…]+$/u, "").trim()
}

function projectWords(name) {
  return name
    .toLocaleLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
}

function inMalaysia(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 0.8 && lat <= 7.6 && lng >= 99 && lng <= 119.5
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
function usefulImage(raw, base) {
  if (!raw || raw.startsWith("data:")) return null
  let url
  try {
    url = new URL(raw, base)
  } catch {
    return null
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  const path = safeDecode(url.pathname)
  if (!/\.(jpe?g|png|webp)$/i.test(path)) return null
  if (SKIP_IMAGE.test(path)) return null
  const thumb = path.match(/-(\d+)x(\d+)\.(jpe?g|png|webp)$/i)
  if (thumb && Number(thumb[1]) < 400 && Number(thumb[2]) < 400) return null
  url.hash = ""
  return url.toString().slice(0, 800)
}

function usefulVideo(raw) {
  try {
    const url = new URL(raw)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (/favicon|logo|icon|sprite|emoji/i.test(url.pathname)) return null
    return url.toString().slice(0, 800)
  } catch {
    return null
  }
}

function imageRank(url) {
  const path = url.toLowerCase()
  let rank = /\.jpe?g/.test(path) ? 3 : 0
  if (/facade|exterior|banner|visual|homepage|skyview|gallery|hero|piazza/.test(path)) rank += 5
  if (/share|popup|overlay|gradient|title|logo|icon|masterplan/.test(path)) rank -= 4
  return rank
}

function preferPhotos(images) {
  return [...images].sort((a, b) => imageRank(b) - imageRank(a)).slice(0, 8)
}

function openWebsite(value) {
  try {
    const url = new URL(value)
    if (url.username || url.password) return ""
    if (url.protocol !== "http:" && url.protocol !== "https:") return ""
    return url.toString()
  } catch {
    return ""
  }
}
function addUnique(list, value, limit) {
  if (!value || list.includes(value) || list.length >= limit) return
  list.push(value)
}

function extractImages(html, pageUrl) {
  const images = []
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0]
    if (!/og:image|twitter:image/i.test(tag)) continue
    const content = tag.match(/content=["']([^"']+)["']/i)
    if (content) addUnique(images, usefulImage(content[1], pageUrl), 8)
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0]
    for (const attr of ["src", "data-src", "data-lazy-src", "data-original"]) {
      const found = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"))
      if (found) addUnique(images, usefulImage(found[1], pageUrl), 8)
    }
    const srcset = tag.match(/srcset=["']([^"']+)["']/i)
    if (srcset) addUnique(images, usefulImage(srcset[1].split(",")[0].trim().split(/\s+/)[0], pageUrl), 8)
  }
  return images
}

function extractVideos(html) {
  const videos = []
  for (const match of html.matchAll(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/gi)) {
    addUnique(videos, usefulVideo(`https://www.youtube.com/watch?v=${match[1]}`), 3)
  }
  for (const match of html.matchAll(/vimeo\.com\/(?:video\/)?(\d{6,12})/gi)) {
    addUnique(videos, usefulVideo(`https://vimeo.com/${match[1]}`), 3)
  }
  for (const match of html.matchAll(/https?:\/\/[^"'\s>]+\.(?:mp4|webm)(?:\?[^"'\s>]*)?/gi)) {
    addUnique(videos, usefulVideo(match[0]), 3)
  }
  return videos
}

function projectLink(html, pageUrl, words) {
  if (words.length === 0) return null
  let best = null
  let bestScore = 0
  const base = new URL(pageUrl)
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    let url
    try {
      url = new URL(match[1], pageUrl)
    } catch {
      continue
    }
    if (url.host !== base.host || url.pathname === "/" || url.pathname === base.pathname) continue
    if (/wp-admin|wp-login|cart|checkout|\.pdf$/i.test(url.pathname)) continue
    const text = html.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 180).replace(/<[^>]+>/g, " ")
    const hay = safeDecode(`${url.pathname} ${url.search} ${text}`).toLowerCase()
    const score = words.filter((word) => hay.includes(word)).length
    if (score > bestScore) {
      bestScore = score
      best = url.toString()
    }
  }
  return bestScore > 0 ? best : null
}

function hostMatches(pageUrl, words) {
  const host = new URL(pageUrl).hostname.toLowerCase()
  return words.some((word) => host.includes(word))
}

async function fetchHtml(pageUrl) {
  const response = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; sellmyhouse/1.0; +https://sellmyhouse.vercel.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(String(response.status))
  const type = response.headers.get("content-type") ?? ""
  if (type && !type.includes("html") && !type.includes("text")) throw new Error(type.split(";")[0])
  return (await response.text()).slice(0, 1_500_000)
}

function nameScore(label, words) {
  const tokens = label.toLocaleLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 3)
  let score = 0
  for (const word of words) {
    const matched = tokens.some((token) => {
      if (token === word) return true
      const shorter = word.length < token.length ? word : token
      const longer = word.length < token.length ? token : word
      return shorter.length >= 5 && longer.startsWith(shorter)
    })
    if (matched) score += 1
  }
  return score
}

async function photon(query, layer) {
  const wait = nextGeo - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  nextGeo = Date.now() + 1100
  const url = new URL("https://photon.komoot.io/api/")
  url.searchParams.set("q", query)
  url.searchParams.set("limit", "5")
  url.searchParams.set("lat", "4.2")
  url.searchParams.set("lon", "101.9")
  url.searchParams.set("layer", layer)
  const response = await fetch(url, {
    headers: {
      "User-Agent": "sellmyhouse/1.0 (development map)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(20000),
  })
  if (response.status === 429 || response.status >= 500) {
    const error = new Error(`${response.status} geocoder`)
    error.retry = true
    throw error
  }
  if (!response.ok) throw new Error(`${response.status} geocoder`)
  const data = await response.json()
  return Array.isArray(data.features) ? data.features : []
}

async function geocode(query, words) {
  let best = null
  for (const layer of ["locality", "street"]) {
    const features = await photon(query, layer)
    for (const feature of features) {
      const [lng, lat] = feature.geometry?.coordinates ?? []
      const label = String(feature.properties?.name || "").trim()
      const country = feature.properties?.country
      if (!label || !inMalaysia(lat, lng)) continue
      if (country && country !== "Malaysia") continue
      if (BROAD_PLACES.has(label.toLocaleLowerCase())) continue
      const score = nameScore(label, words)
      if (score < 1) continue
      if (!best || score > best.score) best = { lat, lng, label, score, layer }
    }
    if (best && best.layer === "locality" && best.score >= 2) break
  }
  return best
}

async function fillLocations() {
  const rows = locationQueue.all()
  if (rows.length === 0) return 0
  console.log(`locations to place ${rows.length}`)
  let geocoderFailures = 0
  for (const row of rows) {
    const name = developmentName(row.title, row.code, row.propertyType)
    const words = projectWords(name)
    const specificWords = words.filter((word) => !GENERIC_WORDS.has(word))
    const usableWords = specificWords.length > 0 ? specificWords : words
    try {
      const point = usableWords.length === 0 ? null : await geocode(`${name}, ${row.location}`, usableWords)
      geocoderFailures = 0
      if (!point) {
        markLocationTried.run({ code: row.code })
        console.log(`place miss ${row.code} ${name}`)
        continue
      }
      saveLocation.run({ code: row.code, lat: point.lat, lng: point.lng })
      console.log(`located ${row.code} ${point.lat.toFixed(5)},${point.lng.toFixed(5)} ${point.label} ${point.layer} ${point.score}`)
    } catch (error) {
      geocoderFailures += 1
      const message = error instanceof Error ? error.message : "failed"
      console.log(`place retry ${row.code} ${message}`)
      if (geocoderFailures >= 3) break
      if (error?.retry) await new Promise((resolve) => setTimeout(resolve, 15000))
    }
  }
  return rows.length
}

async function readSite(row) {
  const html = await fetchHtml(row.website)
  const name = developmentName(row.title, row.code, row.propertyType)
  const words = projectWords(name)
  const sub = projectLink(html, row.website, words)
  let images = []
  let videos = []
  if (sub) {
    const subHtml = await fetchHtml(sub)
    images = extractImages(subHtml, sub)
    videos = extractVideos(subHtml)
  }
  if (images.length === 0) {
    const homeImages = extractImages(html, row.website)
    const matched = homeImages.filter((url) => words.some((word) => safeDecode(url).toLowerCase().includes(word)))
    if (matched.length > 0) images = matched
    else if (words.length === 0 || hostMatches(row.website, words)) images = homeImages
  }
  if (videos.length === 0 && images.length > 0) videos = extractVideos(html)
  return { images: preferPhotos(images), videos: videos.slice(0, 3) }
}

async function fillMedia() {
  const rows = mediaQueue.all().filter((row) => (mediaFailures.get(row.code) ?? 0) < 2)
  if (rows.length === 0) return 0
  console.log(`sites to read ${rows.length}`)
  let index = 0
  async function worker() {
    while (index < rows.length) {
      const row = rows[index]
      index += 1
      try {
      const website = openWebsite(row.website)
      if (!website) {
        saveMedia.run({ code: row.code, image: "", images: "", videos: "[]" })
        console.log(`media skip ${row.code} website`)
        continue
      }
      const media = await readSite({ ...row, website })
        saveMedia.run({
          code: row.code,
          image: media.images[0] ?? "",
          images: media.images.length > 0 ? JSON.stringify(media.images) : "",
          videos: JSON.stringify(media.videos),
        })
        mediaFailures.delete(row.code)
        console.log(`media ${row.code} photos ${media.images.length} videos ${media.videos.length}`)
      } catch (error) {
        const attempts = (mediaFailures.get(row.code) ?? 0) + 1
        mediaFailures.set(row.code, attempts)
        const message = error instanceof Error ? error.message : "failed"
        if (attempts >= 2) {
          try {
            saveMedia.run({ code: row.code, image: "", images: "", videos: "[]" })
          } catch {
            // The import is writing the same database. The next pass retries.
          }
          console.log(`media skip ${row.code} ${message}`)
        } else {
          console.log(`media retry ${row.code} ${message}`)
        }
      }
    }
  }
  await Promise.all([worker(), worker()])
  return rows.length
}

function tidySavedMedia() {
  const rows = db.prepare(`
    SELECT json_extract(metadata, '$.projectCode') AS code,
           images,
           json_extract(metadata, '$.videos') AS videos
    FROM Property
    WHERE json_extract(metadata, '$.register') = 'TEDUH'
      AND json_extract(metadata, '$.mediaChecked') = 1
      AND image NOT LIKE '%placehold.co%'
    GROUP BY code
  `).all()
  for (const row of rows) {
    let images = []
    let videos = []
    try {
      const parsedImages = JSON.parse(row.images)
      if (Array.isArray(parsedImages)) images = parsedImages.filter((item) => typeof item === "string")
    } catch {
      images = []
    }
    try {
      const parsedVideos = JSON.parse(row.videos)
      if (Array.isArray(parsedVideos)) videos = parsedVideos
    } catch {
      videos = []
    }
    images = preferPhotos(images)
    videos = videos.map((video) => (typeof video === "string" ? usefulVideo(video) : null)).filter(Boolean)
    saveMedia.run({
      code: row.code,
      image: images[0] ?? "",
      images: images.length > 0 ? JSON.stringify(images) : "",
      videos: JSON.stringify(videos),
    })
    console.log(`ranked ${row.code}`)
  }
}

tidySavedMedia()

let idle = 0
while (true) {
  const sites = await fillMedia()
  const locations = await fillLocations()
  if (locations === 0 && sites === 0) {
    idle += 1
    if (idle === 1 || idle % 10 === 0) console.log("waiting for new developments")
    await new Promise((resolve) => setTimeout(resolve, 30000))
  } else {
    idle = 0
  }
}
