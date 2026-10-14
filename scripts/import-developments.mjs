import { mkdirSync, readFileSync, appendFileSync, existsSync, writeFileSync } from "node:fs"
import Database from "better-sqlite3"

const db = new Database("prisma/dev.db")

const ROOT = "https://teduh.kpkt.gov.my"
const headers = {
  Accept: "application/json",
  "User-Agent": "sellmyhouse-import/1.0",
}
const donePath = "data/teduh-done.txt"
const priorityStates = ["14", "07", "01"]
let nextSlot = 0

mkdirSync("data", { recursive: true })
const done = new Set(
  existsSync(donePath)
    ? readFileSync(donePath, "utf8").split(/\s+/).filter(Boolean)
    : [],
)

const insertProperty = db.prepare(`
  INSERT INTO Property (
    title, price, currency, location, propertyType, bedrooms, bathrooms,
    builtUp, landSize, tenure, images, description, contactType,
    contactName, contactPhone, contactEmail, source, solicitorId, agentId,
    metadata, image
  )
  SELECT @title, @price, 'MYR', @location, @propertyType, @bedrooms, @bathrooms,
         NULL, NULL, NULL, @images, @description, 'agent',
         @contactName, @contactPhone, NULL, 'imported', NULL, NULL,
         @metadata, @image
  WHERE NOT EXISTS (SELECT 1 FROM Property WHERE title = @title)
`)

function money(value) {
  if (typeof value !== "string") return null
  const amount = Math.round(Number(value.replace(/,/g, "")))
  if (!Number.isInteger(amount) || amount < 1 || amount > 2_000_000_000) return null
  return amount
}

function firstNumber(value) {
  if (typeof value !== "string") return null
  const match = value.match(/\d+/)
  if (!match) return null
  const number = Number(match[0])
  return number <= 30 ? number : null
}

function cleanType(value) {
  if (typeof value !== "string") return null
  const type = value.replace(/[^\p{L}\s-]/gu, " ").replace(/\s+/g, " ").trim()
  if (type.length < 2 || type.length > 40) return null
  return type
}

function listingTitle(name, type, code) {
  const suffix = `${type} ${code}`
  const room = 140 - suffix.length - 1
  const head = name.length > room ? `${name.slice(0, Math.max(0, room - 1)).trim()}…` : name
  return `${head} ${suffix}`.slice(0, 140)
}

function photo(title) {
  return `https://placehold.co/1200x800/0f172a/f8fafc/png?text=${encodeURIComponent(title)}`
}

async function getJson(path) {
  let lastError
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const wait = nextSlot - Date.now()
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    nextSlot = Date.now() + 800
    try {
      const response = await fetch(`${ROOT}${path}`, {
        headers,
        signal: AbortSignal.timeout(60000),
      })
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after"))
        const pause = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 20000
        nextSlot = Date.now() + pause
        lastError = new Error(`429 ${path}`)
        continue
      }
      if (!response.ok) throw new Error(`${response.status} ${path}`)
      return await response.json()
    } catch (error) {
      lastError = error
      nextSlot = Date.now() + 3000
    }
  }
  throw lastError
}

async function pool(items, limit, worker) {
  let index = 0
  async function run() {
    while (index < items.length) {
      const current = index
      index += 1
      await worker(items[current])
    }
  }
  await Promise.all(Array.from({ length: limit }, run))
}

async function projectIds(state, refresh = false) {
  const cachePath = `data/teduh-state-${state}.json`
  if (!refresh && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8"))
  }
  const first = await getJson(`/api/projek-swasta?page=1&state=${state}`)
  const projects = first.projects
  const rows = projects.data.map(compact)
  const pages = []
  for (let page = 2; page <= projects.last_page; page += 1) pages.push(page)
  await pool(pages, 2, async (page) => {
    const data = await getJson(`/api/projek-swasta?page=${page}&state=${state}`)
    rows.push(...data.projects.data.map(compact))
    if (page % 10 === 0) console.log(`state ${state} list page ${page}/${projects.last_page}`)
  })
  console.log(`state ${state} projects ${rows.length}`)
  writeFileSync(cachePath, JSON.stringify(rows))
  return rows
}

function compact(row) {
  return {
    id: row.id,
    name: row.nama,
    lat: row.latitud,
    lng: row.longitud,
  }
}

function cleanPhone(value) {
  if (typeof value !== "string") return ""
  const phone = value.trim()
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 6 || digits.length > 15) return ""
  return phone.slice(0, 30)
}

function cleanWebsite(value) {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  if (!trimmed || trimmed === "-") return ""
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.username || url.password) return ""
    if (url.protocol !== "http:" && url.protocol !== "https:") return ""
    return url.toString().slice(0, 200)
  } catch {
    return ""
  }
}

function developerContact(pemaju) {
  const phone = cleanPhone(pemaju?.telefon)
  const second = cleanPhone(pemaju?.telefon2)
  return {
    developer: typeof pemaju?.nama === "string" ? pemaju.nama.trim().slice(0, 120) : "",
    phone,
    phone2: second && second !== phone ? second : "",
    website: cleanWebsite(pemaju?.alamat_web),
  }
}

function coordinate(value, fallback) {
  const raw = value === null || value === undefined || value === "" ? fallback : value
  if (raw === null || raw === undefined || raw === "") return null
  const number = Number(raw)
  if (!Number.isFinite(number) || Math.abs(number) > 180) return null
  return number
}

function placedCoordinate(lat, lng) {
  if (lat == null || lng == null || (lat === 0 && lng === 0)) return { lat: null, lng: null }
  if (lat < 0.8 || lat > 7.6 || lng < 99 || lng > 119.5) return { lat: null, lng: null }
  return { lat, lng }
}

const writeUnits = db.transaction((units) => {
  for (const unit of units) insertProperty.run(unit)
})

async function importProject(project) {
  if (done.has(project.id)) return
  const detail = await getJson(`/api/projek-swasta/${encodeURIComponent(project.id)}`)
  const info = detail.projek ?? {}
  const name = typeof info.nama === "string" && info.nama.trim() ? info.nama.trim() : project.name
  const negeri = typeof info.negeri === "string" && info.negeri !== "-" ? info.negeri : "Malaysia"
  const daerah = typeof info.daerah === "string" && info.daerah !== "-" ? info.daerah : ""
  const location = `${daerah ? `${daerah}, ` : ""}${negeri}, Malaysia`.slice(0, 120)
  const status = detail.status?.keseluruhan ?? "Licensed"
  const contact = developerContact(detail.pemaju)
  const developer = contact.developer
  const point = placedCoordinate(
    coordinate(detail.lat, project.lat),
    coordinate(detail.lng, project.lng),
  )
  const rows = Array.isArray(detail.status?.rows) ? detail.status.rows : []
  const units = []

  for (const row of rows) {
    const sold = Number(String(row.peratus ?? "").replace(/,/g, ""))
    if (Number.isFinite(sold) && sold >= 100) continue
    const price = money(row.hargaMin)
    const priceMax = money(row.hargaMax)
    const type = cleanType(row.jenis)
    if (!name || price == null || !type) continue
    const bedrooms = firstNumber(row.bilik)
    const bathrooms = firstNumber(row.tandas)
    const variant = bedrooms == null ? type : `${type} ${bedrooms} bed`
    const title = listingTitle(name, variant, project.id)
    const count = Number(row.unit)
    const description = [
      `${name} is a licensed housing development in ${location.replace(/, Malaysia$/, "")}.`,
      `This ${type} is a starting unit`,
      Number.isFinite(count) ? `for ${count} units of this type` : "",
      priceMax ? `published from MYR ${price.toLocaleString()} to MYR ${priceMax.toLocaleString()}.` : `published at MYR ${price.toLocaleString()}.`,
      `Project status: ${status}.`,
      "Prices come from the public licensed-housing register.",
    ].filter(Boolean).join(" ").slice(0, 2000)
    const image = photo(title)
    units.push({
      title,
      price,
      location,
      propertyType: type,
      bedrooms,
      bathrooms,
      images: JSON.stringify([image]),
      description,
      image,
      contactName: developer,
      contactPhone: contact.phone || contact.phone2 || null,
      metadata: JSON.stringify({
        listingKey: `teduh:${project.id}:${variant}`,
        projectCode: project.id,
        developer,
        phone: contact.phone,
        phone2: contact.phone2,
        website: contact.website,
        contactChecked: 1,
        status,
        unitType: type,
        units: Number.isFinite(count) ? count : null,
        priceMin: price,
        priceMax,
        lat: point.lat,
        lng: point.lng,
        register: "TEDUH",
      }),
    })
  }

  if (units.length > 0) writeUnits(units)
  appendFileSync(donePath, `${project.id}\n`)
  done.add(project.id)
}

const updateContact = db.prepare(`
  UPDATE Property
  SET contactName = CASE
        WHEN contactName IS NULL OR contactName = '' THEN @developer
        ELSE contactName
      END,
      contactPhone = NULLIF(CASE WHEN @phone != '' THEN @phone ELSE @phone2 END, ''),
      metadata = json_set(
        metadata,
        '$.phone', @phone,
        '$.phone2', @phone2,
        '$.website', @website,
        '$.developer', CASE WHEN @developer != '' THEN @developer ELSE json_extract(metadata, '$.developer') END,
        '$.contactChecked', 1
      )
  WHERE json_extract(metadata, '$.projectCode') = @code
    AND json_extract(metadata, '$.register') = 'TEDUH'
`)

async function backfillContacts() {
  const codes = db.prepare(`
    SELECT json_extract(metadata, '$.projectCode') AS code
    FROM Property
    WHERE json_extract(metadata, '$.register') = 'TEDUH'
      AND json_extract(metadata, '$.contactChecked') IS NULL
    GROUP BY code
  `).all()
  console.log(`contact backfill ${codes.length}`)
  let filled = 0
  await pool(codes, 2, async (row) => {
    if (!row.code) return
    try {
      const detail = await getJson(`/api/projek-swasta/${encodeURIComponent(row.code)}`)
      const contact = developerContact(detail.pemaju)
      updateContact.run({
        code: row.code,
        developer: contact.developer,
        phone: contact.phone,
        phone2: contact.phone2,
        website: contact.website,
      })
      filled += 1
      if (filled % 25 === 0) console.log(`contacts added ${filled}`)
    } catch (error) {
      console.log(`contact skip ${row.code} ${error instanceof Error ? error.message : "failed"}`)
    }
  })
}

async function crawl(refresh) {
  const states = await getJson("/api/negeri")
  await backfillContacts()

  const stateIds = [
    ...priorityStates.filter((id) => states.some((state) => state.id === id)),
    ...states.map((state) => state.id).filter((id) => !priorityStates.includes(id)),
  ]

  let imported = 0
  for (const state of stateIds) {
    const projects = (await projectIds(state, refresh)).filter((project) => project.id && !done.has(project.id))
    await pool(projects, 2, async (project) => {
      try {
        await importProject(project)
        imported += 1
        if (imported % 25 === 0) console.log(`imported projects ${imported} latest ${project.id}`)
      } catch (error) {
        console.log(`skip ${project.id} ${error instanceof Error ? error.message : "failed"}`)
      }
    })
  }

  console.log(`finished imported ${imported}`)
}

let pass = 0
while (true) {
  try {
    await crawl(pass > 0)
    console.log(`crawl pass ${pass + 1} complete`)
  } catch (error) {
    console.log(`crawl pass failed ${error instanceof Error ? error.message : "failed"}`)
  }
  pass += 1
  console.log("next development crawl in 6 hours")
  await new Promise((resolve) => setTimeout(resolve, 6 * 60 * 60 * 1000))
}
