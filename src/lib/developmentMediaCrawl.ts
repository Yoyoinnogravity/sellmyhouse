// @ts-nocheck -- ported unchanged from scripts/fill-development-media.mjs
// Finds the photos and videos a developer shows for a project on its own
// website (the website listed for it in Malaysia's TEDUH register).
// Pictures are shown linked from the developer's site and credited to it.

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
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
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

const PHOTO_LIMIT = 10
const PAGE_LIMIT = 6
const GALLERY_HINT = /gallery|galeri|photos?|gambar|images|unit|facade|fasad|interior|eksterior|type|jenis|residence|residensi|project|projek|propert|developments?|brochure|elevation|living|bedroom|kitchen|tower|showroom|layout/i

function imageRank(url) {
  const path = url.toLowerCase()
  let rank = /\.jpe?g/.test(path) ? 3 : 0
  if (/facade|fasad|exterior|interior|bedroom|living|kitchen|gallery|hero|elevation|unit/.test(path)) rank += 5
  if (/banner|visual|homepage|skyview|piazza/.test(path)) rank += 2
  if (/share|popup|overlay|gradient|title|logo|icon|masterplan|sitemap|qr/.test(path)) rank -= 4
  return rank
}

function preferPhotos(images) {
  return [...new Set(images)].sort((a, b) => imageRank(b) - imageRank(a)).slice(0, PHOTO_LIMIT)
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

function largestSrc(srcset, pageUrl) {
  let best = null
  let bestWidth = -1
  for (const part of srcset.split(",")) {
    const bits = part.trim().split(/\s+/)
    const image = usefulImage(bits[0], pageUrl)
    const width = Number((bits[1] || "").replace(/w$/i, ""))
    const score = Number.isFinite(width) && width > 0 ? width : bestWidth + 1
    if (image && score >= bestWidth) {
      best = image
      bestWidth = score
    }
  }
  return best
}

function extractImages(html, pageUrl) {
  const images = []
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0]
    if (!/og:image|twitter:image/i.test(tag)) continue
    const content = tag.match(/content=["']([^"']+)["']/i)
    if (content) addUnique(images, usefulImage(content[1], pageUrl), 24)
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0]
    for (const attr of ["src", "data-src", "data-lazy-src", "data-original", "data-full", "data-image"]) {
      const found = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"))
      if (found) addUnique(images, usefulImage(found[1], pageUrl), 30)
    }
    const srcset = tag.match(/(?:srcset|data-srcset)=["']([^"']+)["']/i)
    if (srcset) addUnique(images, largestSrc(srcset[1], pageUrl), 30)
  }
  for (const match of html.matchAll(/<source\b[^>]*>/gi)) {
    const tag = match[0]
    const srcset = tag.match(/(?:srcset|data-srcset)=["']([^"']+)["']/i)
    if (srcset) addUnique(images, largestSrc(srcset[1], pageUrl), 30)
    const src = tag.match(/src=["']([^"']+)["']/i)
    if (src) addUnique(images, usefulImage(src[1], pageUrl), 30)
  }
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi)) {
    addUnique(images, usefulImage(match[1], pageUrl), 24)
  }
  for (const match of html.matchAll(/url\((['"]?)([^'")]+)\1\)/gi)) {
    addUnique(images, usefulImage(match[2], pageUrl), 24)
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

function siteHost(hostname) {
  return hostname.toLowerCase().replace(/^www\./, "")
}

function projectPages(html, pageUrl, words, allowGallery, allowExternal) {
  const base = new URL(pageUrl)
  const ranked = []
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    let url
    try {
      url = new URL(match[1], pageUrl)
    } catch {
      continue
    }
    if (url.pathname === "/" || url.pathname === base.pathname) continue
    if (/\/feed\/?$|wp-json|xmlrpc|wp-admin|wp-login|cart|checkout|\.pdf$/i.test(url.pathname)) continue
    const offHost = siteHost(url.hostname) !== siteHost(base.hostname)
    if (offHost && (!allowExternal || /facebook|instagram|youtube|youtu\.be|tiktok|linkedin|whatsapp|twitter|google|pinterest/i.test(url.hostname))) continue
    const text = html.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 180).replace(/<[^>]+>/g, " ")
    const hay = safeDecode(`${url.hostname} ${url.pathname} ${url.search} ${text}`).toLowerCase()
    const nameScore = words.filter((word) => hay.includes(word)).length
    const pathScore = words.filter((word) => safeDecode(`${url.hostname}${url.pathname}`).toLowerCase().includes(word)).length
    if (offHost && pathScore === 0) continue
    const galleryScore = GALLERY_HINT.test(hay) ? 1 : 0
    if (nameScore === 0 && !(allowGallery && galleryScore)) continue
    ranked.push({ url: url.toString(), score: nameScore * 3 + pathScore + galleryScore })
  }
  ranked.sort((a, b) => b.score - a.score)
  const pages = []
  for (const page of ranked) {
    if (pages.includes(page.url)) continue
    pages.push(page.url)
    if (pages.length >= 7) break
  }
  return pages
}

function hostMatches(pageUrl, words) {
  const host = siteHost(new URL(pageUrl).hostname)
  return words.some((word) => host.includes(word))
}

function isGalleryPage(pageUrl) {
  try {
    return GALLERY_HINT.test(safeDecode(new URL(pageUrl).pathname).toLowerCase())
  } catch {
    return false
  }
}

function pageLabel(pageUrl) {
  try {
    const url = new URL(pageUrl)
    return `${siteHost(url.hostname)}${url.pathname}`
  } catch {
    return pageUrl
  }
}

function refreshTarget(html, pageUrl) {
  const tag = html.match(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/i)
  const content = tag?.[0].match(/content=["']([^"']+)["']/i)
  const target = content?.[1].match(/url\s*=\s*['"]?([^'">\s]+)/i)
  if (!target) return null
  try {
    const url = new URL(target[1], pageUrl)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    if (url.username || url.password) return null
    if (siteHost(url.hostname) !== siteHost(new URL(pageUrl).hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

function entryPage(html, pageUrl) {
  const base = new URL(pageUrl)
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    let url
    try {
      url = new URL(match[1], pageUrl)
    } catch {
      continue
    }
    if (siteHost(url.hostname) !== siteHost(base.hostname)) continue
    if (/\/(home|main|index)(\.php|\.html?)?\/?$/i.test(url.pathname)) return url.toString()
  }
  return null
}

async function fetchHtml(pageUrl, depth = 0) {
  const response = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; sellmyhouse/1.0; +https://sellmyhouse.asia)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(String(response.status))
  const type = response.headers.get("content-type") ?? ""
  if (type && !type.includes("html") && !type.includes("text")) throw new Error(type.split(";")[0])
  const html = (await response.text()).slice(0, 1_500_000)
  const next = depth === 0 ? refreshTarget(html, response.url) : null
  if (next && next !== response.url) return fetchHtml(next, 1)
  return { html, url: response.url }
}

async function sitemapPages(pageUrl, words) {
  const origin = new URL(pageUrl).origin
  const maps = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]
  const seenMaps = new Set()
  const pages = []
  while (maps.length > 0 && seenMaps.size < 6 && pages.length < 3) {
    const mapUrl = maps.shift()
    if (!mapUrl || seenMaps.has(mapUrl)) continue
    seenMaps.add(mapUrl)
    let xml = ""
    try {
      const response = await fetch(mapUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; sellmyhouse/1.0; +https://sellmyhouse.asia)",
          Accept: "application/xml,text/xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(6000),
      })
      if (!response.ok) continue
      xml = (await response.text()).slice(0, 2_000_000)
    } catch {
      continue
    }
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
      let url
      try {
        url = new URL(match[1].trim())
      } catch {
        continue
      }
      if (siteHost(url.hostname) !== siteHost(new URL(origin).hostname)) continue
      if (/\.xml$/i.test(url.pathname)) {
        const next = url.toString()
        if (!seenMaps.has(next) && !maps.includes(next)) {
          if (/project|propert/i.test(url.pathname)) maps.unshift(next)
          else maps.push(next)
        }
        continue
      }
      const hay = safeDecode(url.pathname).toLowerCase()
      if (!words.some((word) => hay.includes(word))) continue
      if (!pages.includes(url.toString())) pages.push(url.toString())
      if (pages.length >= 3) break
    }
  }
  return pages
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

function ownedPhoto(url, words) {
  const hay = safeDecode(url).toLowerCase()
  return words.some((word) => hay.includes(word))
}

async function readSite(row) {
  const home = await fetchHtml(row.website)
  const name = developmentName(row.title, row.code, row.propertyType)
  const words = projectWords(name).filter((word) => !GENERIC_WORDS.has(word))
  const usable = words.length > 0 ? words : projectWords(name)
  const trustedHome = usable.length === 0 || hostMatches(home.url, usable)
  const named = projectPages(home.html, home.url, usable, true, true)
  const queue = [home.url, ...named]
  const door = entryPage(home.html, home.url)
  if (door && !queue.includes(door)) queue.splice(1, 0, door)
  if (named.length === 0) {
    for (const page of await sitemapPages(home.url, usable)) {
      if (!queue.includes(page)) queue.push(page)
    }
  }
  const seen = new Set([row.website, home.url])
  const pages = []
  const galleries = []
  const images = []
  let videos = []

  while (queue.length > 0 && pages.length < PAGE_LIMIT && images.length < 30) {
    const pageUrl = queue.shift()
    if (!pageUrl || seen.has(pageUrl) && pageUrl !== home.url) continue
    seen.add(pageUrl)
    if (pages.length > 0) await new Promise((resolve) => setTimeout(resolve, 400))
    let pageHtml = home.html
    let finalUrl = home.url
    if (pageUrl !== home.url) {
      try {
        const page = await fetchHtml(pageUrl)
        pageHtml = page.html
        finalUrl = page.url
      } catch {
        continue
      }
    }
    if (pages.includes(finalUrl)) continue
    pages.push(finalUrl)
    seen.add(finalUrl)
    if (isGalleryPage(finalUrl) && !galleries.includes(finalUrl)) galleries.push(finalUrl)
    const trusted = finalUrl !== home.url || trustedHome
    const found = extractImages(pageHtml, finalUrl)
    for (const image of found) {
      if (trusted || ownedPhoto(image, usable)) addUnique(images, image, 30)
    }
    if (videos.length === 0) videos = extractVideos(pageHtml)
    if (pages.length < PAGE_LIMIT && (images.length < PHOTO_LIMIT || galleries.length === 0) && finalUrl !== home.url) {
      for (const next of projectPages(pageHtml, finalUrl, usable, true, false)) {
        if (!seen.has(next) && !queue.includes(next)) queue.push(next)
      }
    }
  }

  return {
    images: preferPhotos(images),
    videos: videos.slice(0, 3),
    pages: pages.map(pageLabel),
    galleries: galleries.map(pageLabel),
  }
}


export { readSite, openWebsite, developmentName }
