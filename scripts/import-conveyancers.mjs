import Database from "better-sqlite3"

const db = new Database("prisma/dev.db")
db.pragma("busy_timeout = 30000")

const states = [
  ["JH", "Johor"],
  ["KD", "Kedah"],
  ["KT", "Kelantan"],
  ["MK", "Melaka"],
  ["NS", "Negeri Sembilan"],
  ["PH", "Pahang"],
  ["PG", "Penang"],
  ["PK", "Perak"],
  ["PR", "Perlis"],
  ["SG", "Selangor"],
  ["TG", "Terengganu"],
  ["WPKL", "Kuala Lumpur"],
  ["WPP", "Putrajaya"],
]

const stateNames = [
  ["kuala lumpur", "Kuala Lumpur"],
  ["negeri sembilan", "Negeri Sembilan"],
  ["putrajaya", "Putrajaya"],
  ["penang", "Penang"],
  ["johor", "Johor"],
  ["selangor", "Selangor"],
  ["perak", "Perak"],
  ["melaka", "Melaka"],
  ["kedah", "Kedah"],
  ["kelantan", "Kelantan"],
  ["pahang", "Pahang"],
  ["perlis", "Perlis"],
  ["terengganu", "Terengganu"],
]

const headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": "sellmyhouse-directory/1.0",
  Referer: "https://legaldirectory.malaysianbar.org.my/v/search-result",
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clean(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function readable(value) {
  const text = clean(value)
  if (!text || /[a-z]/.test(text) || text.includes(".")) return text
  return text
    .toLowerCase()
    .replace(/(^|[^a-z])([a-z])/g, (_match, prefix, letter) => prefix + letter.toUpperCase())
}

function normalize(value) {
  return value
    .toLowerCase()
    .replaceAll("wilayah persekutuan kuala lumpur", "kuala lumpur")
    .replaceAll("wilayah persekutuan putrajaya", "putrajaya")
    .replaceAll("pulau pinang", "penang")
    .replaceAll("johore", "johor")
    .replaceAll("georgetown", "george town")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function canonicalState(value, fallback) {
  const place = normalize(value)
  const match = stateNames.find(([name]) => place === name || place.includes(name))
  return match ? match[1] : fallback
}

function cleanEmail(value) {
  const email = clean(value).toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""
}

function cleanPhone(value) {
  const phone = clean(value)
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 6 || digits.length > 15) return ""
  return phone.slice(0, 30)
}

async function firmsFor(stateCode) {
  const rows = []
  let page = 1
  let pages = 1
  while (page <= pages && page <= 30) {
    await sleep(700)
    const body = new URLSearchParams()
    body.append("aop_filter[]", "332")
    body.append("searchtype[]", "Firm")
    body.append("state", stateCode)
    body.append("name", "")
    body.append("alphabet", "")
    body.append("city", "")
    body.append("keyword", "")
    body.append("page", String(page))
    const url =
      page === 1
        ? "https://legaldirectory.malaysianbar.org.my/a/Lawyer/getSearchResult"
        : "https://legaldirectory.malaysianbar.org.my/a/Lawyer/getFirmResult"
    const response = await fetch(url, { method: "POST", headers, body })
    if (!response.ok) throw new Error(`${stateCode} page ${page} returned ${response.status}`)
    const json = await response.json()
    const firms = json.data?.firms
    if (!firms?.data) break
    pages = Number(firms.numpage) || 1
    rows.push(...firms.data)
    console.log(`${stateCode} page ${page}/${pages} ${firms.data.length}`)
    page += 1
  }
  return rows
}

const insertSolicitor = db.prepare(`
  INSERT INTO Solicitor (name, firm, phone, email, country, city, license)
  SELECT @name, @firm, @phone, @email, 'Malaysia', @city, 'Conveyancing'
  WHERE NOT EXISTS (
    SELECT 1 FROM Solicitor
    WHERE (@email != '' AND lower(email) = lower(@email))
       OR (@email = '' AND name = @name AND ifnull(city, '') = ifnull(@city, ''))
  )
`)

const seen = new Set()
const pending = []

for (const [code, label] of states) {
  const firms = await firmsFor(code)
  for (const firm of firms) {
    if (firm.firm_status && firm.firm_status !== "Active") continue
    const name = readable(firm.name)
    if (!name) continue
    const email = cleanEmail(firm.email)
    const phones = [cleanPhone(firm.tel1), cleanPhone(firm.tel2)].filter(Boolean)
    if (!email && phones.length === 0) continue
    const state = canonicalState(firm.state, label)
    const town = readable(firm.city)
    const city =
      town && normalize(town) !== normalize(state) ? `${town}, ${state}` : state
    const key = email || `${name}|${city}`
    if (seen.has(key)) continue
    seen.add(key)
    pending.push({
      name: name.slice(0, 120),
      firm: name.slice(0, 120),
      phone: phones.join(", ").slice(0, 60),
      email,
      city,
    })
  }
}

const saved = db.transaction((rows) => {
  let count = 0
  for (const row of rows) {
    const result = insertSolicitor.run(row)
    count += result.changes
  }
  return count
})(pending)

console.log(`conveyancers found ${pending.length}, added ${saved}`)
db.close()
