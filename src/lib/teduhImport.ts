import { prisma } from "@/lib/prisma";

// Imports licensed housing developments from TEDUH, Malaysia's public
// register of private housing projects (teduh.kpkt.gov.my), a few projects
// per run. Runs are stateless: each picks a page of a state's project list
// (priority states first, then at random) and imports projects not already
// on the site, one listing per unit type still on sale.

const ROOT = "https://teduh.kpkt.gov.my";
const PRIORITY_STATES = ["14", "10", "07", "01", "08", "04"]; // KL, Selangor, Penang, Johor, Perak, Melaka
const HEADERS = { Accept: "application/json", "User-Agent": "sellmyhouse-import/1.0 (+https://sellmyhouse.asia)" };

type ListRow = { id: string; nama?: string; latitud?: unknown; longitud?: unknown };

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${ROOT}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(15000), cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return (await response.json()) as T;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function money(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const amount = Math.round(Number(String(value).replace(/,/g, "")));
  return Number.isInteger(amount) && amount >= 1 && amount <= 2_000_000_000 ? amount : null;
}

function firstNumber(value: unknown): number | null {
  const match = typeof value === "string" ? value.match(/\d+/) : null;
  if (!match) return null;
  const number = Number(match[0]);
  return number <= 30 ? number : null;
}

function cleanType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const type = value.replace(/[^\p{L}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  return type.length >= 2 && type.length <= 40 ? type : null;
}

function cleanPhone(value: unknown): string {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 15 ? value.trim().slice(0, 30) : "";
}

function cleanWebsite(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return "";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.username || url.password || !/^https?:$/.test(url.protocol)) return "";
    return url.toString().slice(0, 200);
  } catch {
    return "";
  }
}

function coordinate(value: unknown, fallback: unknown): number | null {
  const raw = value === null || value === undefined || value === "" ? fallback : value;
  if (raw === null || raw === undefined || raw === "") return null;
  const number = Number(raw);
  return Number.isFinite(number) && Math.abs(number) <= 180 ? number : null;
}

// Malaysia only; anything else is a data-entry slip.
function placed(lat: number | null, lng: number | null) {
  if (lat == null || lng == null || (lat === 0 && lng === 0)) return null;
  if (lat < 0.8 || lat > 7.6 || lng < 99 || lng > 119.5) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

function listingTitle(name: string, variant: string) {
  const room = 140 - variant.length - 3;
  const head = name.length > room ? `${name.slice(0, Math.max(0, room - 1)).trim()}…` : name;
  return `${head} · ${variant}`.slice(0, 140);
}

async function alreadyImported(code: string) {
  const found = await prisma.property.findFirst({
    where: { metadata: { contains: `"projectCode":"${code}"` } },
    select: { id: true },
  });
  return Boolean(found);
}

type Detail = {
  projek?: { nama?: string; negeri?: string; daerah?: string };
  lat?: unknown;
  lng?: unknown;
  pemaju?: { nama?: string; telefon?: string; telefon2?: string; alamat_web?: string };
  status?: { keseluruhan?: string; rows?: Record<string, unknown>[] };
};

async function importProject(row: ListRow): Promise<number> {
  const detail = await getJson<Detail>(`/api/projek-swasta/${encodeURIComponent(row.id)}`);
  const info = detail.projek ?? {};
  const name = (typeof info.nama === "string" && info.nama.trim()) || (row.nama ?? "").trim();
  if (!name) return 0;
  const state = typeof info.negeri === "string" && info.negeri !== "-" ? info.negeri : "";
  const district = typeof info.daerah === "string" && info.daerah !== "-" ? info.daerah : "";
  const location = [district, state, "Malaysia"].filter(Boolean).join(", ").slice(0, 120);
  const status = detail.status?.keseluruhan ?? "Licensed";
  const developer = typeof detail.pemaju?.nama === "string" ? detail.pemaju.nama.trim().slice(0, 80) : "";
  const phone = cleanPhone(detail.pemaju?.telefon);
  const phone2 = cleanPhone(detail.pemaju?.telefon2);
  const website = cleanWebsite(detail.pemaju?.alamat_web);
  const point = placed(coordinate(detail.lat, row.latitud), coordinate(detail.lng, row.longitud));

  const data = [];
  for (const unit of detail.status?.rows ?? []) {
    const sold = Number(String(unit.peratus ?? "").replace(/,/g, ""));
    if (Number.isFinite(sold) && sold >= 100) continue;
    const price = money(unit.hargaMin);
    const priceMax = money(unit.hargaMax);
    const type = cleanType(unit.jenis);
    if (price == null || !type) continue;
    const bedrooms = firstNumber(unit.bilik);
    const bathrooms = firstNumber(unit.tandas);
    const variant = bedrooms == null ? type : `${type}, ${bedrooms} bed`;
    const count = Number(unit.unit);
    const place = location.replace(/, Malaysia$/, "");
    const description = [
      `${name} is a licensed housing development in ${place}${developer ? ` by ${developer}` : ""}.`,
      `${type} units${Number.isFinite(count) ? ` (${count} of this type)` : ""}`,
      priceMax && priceMax !== price
        ? `are listed from MYR ${price.toLocaleString()} to MYR ${priceMax.toLocaleString()}.`
        : `are listed at MYR ${price.toLocaleString()}.`,
      `Project status: ${status}.`,
      "Details from Malaysia's public licensed-housing register (TEDUH). Contact the developer to confirm availability.",
    ].join(" ").slice(0, 2000);

    data.push({
      title: listingTitle(name, variant),
      price,
      currency: "MYR",
      location,
      propertyType: type,
      bedrooms,
      bathrooms,
      description,
      contactType: "agent", // developer listings, as with earlier imports
      contactName: developer || null,
      contactPhone: phone || phone2 || null,
      source: "imported",
      metadata: JSON.stringify({
        listingKey: `teduh:${row.id}:${variant}`,
        projectCode: row.id,
        developer,
        phone,
        phone2: phone2 && phone2 !== phone ? phone2 : "",
        website,
        contactChecked: 1,
        status,
        unitType: type,
        units: Number.isFinite(count) ? count : null,
        priceMin: price,
        priceMax,
        ...(point ?? {}),
        register: "TEDUH",
      }),
    });
  }
  if (data.length > 0) await prisma.property.createMany({ data });
  return data.length;
}

export async function runTeduhImport(options: { maxProjects?: number; deadlineMs?: number; state?: string; page?: number } = {}) {
  const started = Date.now();
  const deadline = started + (options.deadlineMs ?? 45_000);
  const maxProjects = options.maxProjects ?? 8;
  const log: string[] = [];

  // Priority states most of the time; any state now and then.
  let state = options.state;
  if (!state) {
    if (Math.random() < 0.8) {
      state = PRIORITY_STATES[Math.floor(Math.random() * PRIORITY_STATES.length)];
    } else {
      const states = await getJson<{ id: string }[]>("/api/negeri");
      state = states[Math.floor(Math.random() * states.length)]?.id ?? "14";
    }
  }

  const first = await getJson<{ projects: { last_page: number; data: ListRow[] } }>(`/api/projek-swasta?page=1&state=${state}`);
  const lastPage = Math.max(1, first.projects.last_page || 1);
  const page = options.page ?? 1 + Math.floor(Math.random() * lastPage);
  const list = page === 1 ? first : await getJson<typeof first>(`/api/projek-swasta?page=${page}&state=${state}`);
  log.push(`state ${state} page ${page}/${lastPage}: ${list.projects.data.length} projects`);

  let projects = 0;
  let listings = 0;
  for (const row of list.projects.data) {
    if (projects >= maxProjects || Date.now() > deadline) break;
    if (!row?.id || (await alreadyImported(row.id))) continue;
    try {
      await pause(600);
      const added = await importProject(row);
      projects += 1;
      listings += added;
      log.push(`${row.id} ${row.nama ?? ""}: ${added} listings`);
    } catch (error) {
      log.push(`skip ${row.id}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  return { state, page, lastPage, projects, listings, ms: Date.now() - started, log };
}
