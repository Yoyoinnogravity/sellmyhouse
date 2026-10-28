import { geoIndex, pinMetadata } from "@/lib/listingGeo";
import { picturePoint } from "@/lib/places";
import { isRental } from "@/lib/rental";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/queryCache";

// "Compare prices nearby" for a listing. Two kinds of figures:
//  1. Asking prices of other listings on this site near it (including
//     developer prices from Malaysia's public housing register).
//  2. Official sold prices, where a government publishes them under an
//     open licence that allows commercial use:
//     Singapore HDB resale flats (data.gov.sg, Singapore Open Data Licence),
//     France DVF (data.gouv.fr, Licence Ouverte 2.0),
//     England & Wales Price Paid (HM Land Registry, Open Government Licence).

export type CompareRow = { label: string; price: number; detail: string; href?: string };
export type CompareBlock = {
  title: string;
  summary: string;
  currency: string;
  median: number | null;
  rows: CompareRow[];
  source: string; // attribution, required by the licences
  sourceUrl: string;
};

type Subject = {
  id: number;
  title: string;
  price: number;
  currency: string | null;
  location: string;
  propertyType: string | null;
  bedrooms: number | null;
  builtUp: number | null;
  metadata: string | null;
};

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(9000), next: { revalidate: 86400 } });
  if (!response.ok) throw new Error(`${response.status}`);
  return (await response.json()) as T;
}

// --- 1. Listings on this site near the subject -----------------------------

async function nearbyListings(subject: Subject): Promise<CompareBlock | null> {
  const here = picturePoint(subject.location, subject.metadata);
  if (!here) return null;
  const all = await cached(
    "compare:all-listings",
    async () => {
      const [rows, geo] = await Promise.all([
        prisma.property.findMany({
          select: { id: true, title: true, price: true, currency: true, location: true, propertyType: true, bedrooms: true },
        }),
        geoIndex(),
      ]);
      return rows.flatMap((row) => {
        const point = picturePoint(row.location, pinMetadata(geo.get(row.id)));
        const rent = geo.get(row.id)?.rent ?? false;
        return point ? [{ ...row, rent, lat: point.lat, lng: point.lng, precise: point.precise }] : [];
      });
    },
    15 * 60 * 1000,
  );
  const currency = subject.currency ?? "";
  const rent = isRental(subject.metadata);
  const near = all
    .filter((row) => row.id !== subject.id && (row.currency ?? "") === currency && row.rent === rent)
    .map((row) => ({ row, distance: km(here, row) }))
    .filter(({ distance }) => distance <= (here.precise ? 8 : 15))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 40);
  if (near.length === 0) return null;

  const sameBeds = subject.bedrooms ? near.filter(({ row }) => row.bedrooms === subject.bedrooms) : [];
  const pool = sameBeds.length >= 3 ? sameBeds : near;
  return {
    title: rent ? "Rents nearby on this site" : "Asking prices nearby on this site",
    summary: `${pool.length} listing${pool.length === 1 ? "" : "s"} within ${here.precise ? 8 : 15} km${sameBeds.length >= 3 ? ` with ${subject.bedrooms} bedrooms` : ""}.`,
    currency: currency || "",
    median: median(pool.map(({ row }) => row.price)),
    rows: pool.slice(0, 5).map(({ row, distance }) => ({
      label: row.title,
      price: row.price,
      detail: `${distance < 1 ? "under 1" : distance.toFixed(0)} km away${row.bedrooms ? ` · ${row.bedrooms} bed` : ""}`,
      href: `/property/${row.id}`,
    })),
    source: "Listings on Sell My sites, including developer prices from Malaysia's TEDUH register.",
    sourceUrl: "/properties?all=1",
  };
}

// --- 2a. Singapore HDB resale ------------------------------------------------

const HDB_TOWNS = [
  "ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "BUKIT MERAH", "BUKIT PANJANG", "BUKIT TIMAH", "CENTRAL AREA",
  "CHOA CHU KANG", "CLEMENTI", "GEYLANG", "HOUGANG", "JURONG EAST", "JURONG WEST", "KALLANG/WHAMPOA", "MARINE PARADE",
  "PASIR RIS", "PUNGGOL", "QUEENSTOWN", "SEMBAWANG", "SENGKANG", "SERANGOON", "TAMPINES", "TOA PAYOH", "WOODLANDS", "YISHUN",
];

async function singaporeHdb(subject: Subject): Promise<CompareBlock | null> {
  const text = `${subject.location} ${subject.title}`.toUpperCase();
  if (!/SINGAPORE/.test(text)) return null;
  if (/CONDO|LANDED|BUNGALOW|TERRACE|SEMI|DETACHED|EXECUTIVE CONDO/.test(text) && !/HDB/.test(text)) return null;
  const town = HDB_TOWNS.find((name) => text.includes(name) || (name === "KALLANG/WHAMPOA" && /KALLANG|WHAMPOA/.test(text)));
  if (!town) return null;
  const rooms = subject.bedrooms ? Math.min(5, subject.bedrooms + 1) : null;
  const filters: Record<string, string> = { town };
  if (rooms) filters.flat_type = `${rooms} ROOM`;
  const url = new URL("https://data.gov.sg/api/action/datastore_search");
  url.searchParams.set("resource_id", "d_8b84c4ee58e3cfc0ece0d773c8ca6abc");
  url.searchParams.set("filters", JSON.stringify(filters));
  url.searchParams.set("sort", "month desc");
  url.searchParams.set("limit", "60");
  const data = await fetchJson<{ result?: { records?: Record<string, string>[] } }>(url.toString());
  const records = data.result?.records ?? [];
  if (records.length === 0) return null;
  const prices = records.map((record) => Number(record.resale_price)).filter(Number.isFinite);
  const months = records.map((record) => record.month).sort();
  return {
    title: `HDB resale prices in ${town.charAt(0) + town.slice(1).toLowerCase()}`,
    summary: `${records.length} recent ${rooms ? `${rooms}-room ` : ""}resale flats, ${months[0]} to ${months[months.length - 1]}.`,
    currency: "SGD",
    median: median(prices),
    rows: records.slice(0, 5).map((record) => ({
      label: `Blk ${record.block} ${record.street_name}`,
      price: Number(record.resale_price),
      detail: `${record.month} · ${record.flat_type.toLowerCase()} · ${record.floor_area_sqm} sq m · floor ${record.storey_range.toLowerCase()}`,
    })),
    source: "Contains information from Resale flat prices accessed from data.gov.sg, made available under the Singapore Open Data Licence version 1.0.",
    sourceUrl: "https://data.gov.sg/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/view",
  };
}

// --- 2b. France DVF ----------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cell); cell = ""; }
    else cell += c;
  }
  out.push(cell);
  return out;
}

async function franceDvf(subject: Subject): Promise<CompareBlock | null> {
  if (!/france/i.test(subject.location)) return null;
  const parts = subject.location.split(",").map((part) => part.trim()).filter(Boolean);
  const townName = parts.length >= 3 ? parts[parts.length - 3] : parts[0];
  if (!townName) return null;
  const communes = await fetchJson<{ code: string; nom: string; codeDepartement: string }[]>(
    `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(townName)}&fields=code,nom,codeDepartement&boost=population&limit=1`,
  );
  const commune = communes[0];
  if (!commune) return null;
  const flat = /apartment|appartement|condo|flat|studio/i.test(`${subject.propertyType} ${subject.title}`);
  const wanted = flat ? "Appartement" : "Maison";

  let rows: string[][] = [];
  let year = "";
  for (const candidate of ["2025", "2024"]) {
    const response = await fetch(
      `https://files.data.gouv.fr/geo-dvf/latest/csv/${candidate}/communes/${commune.codeDepartement}/${commune.code}.csv`,
      { signal: AbortSignal.timeout(12000), next: { revalidate: 86400 * 7 } },
    );
    if (!response.ok) continue;
    const lines = (await response.text()).split("\n").filter(Boolean);
    if (lines.length < 2) continue;
    const header = parseCsvLine(lines[0]);
    const col = (name: string) => header.indexOf(name);
    const [cId, cDate, cNature, cValue, cType, cArea, cRooms, cNo, cStreet] = [
      "id_mutation", "date_mutation", "nature_mutation", "valeur_fonciere", "type_local",
      "surface_reelle_bati", "nombre_pieces_principales", "adresse_numero", "adresse_nom_voie",
    ].map(col);
    const seen = new Set<string>();
    rows = [];
    for (const line of lines.slice(1)) {
      const r = parseCsvLine(line);
      if (r[cNature] !== "Vente" || r[cType] !== wanted || seen.has(r[cId])) continue;
      seen.add(r[cId]);
      rows.push([r[cDate], r[cValue], r[cArea], r[cRooms], `${r[cNo]} ${r[cStreet]}`.trim()]);
    }
    if (rows.length > 0) {
      year = candidate;
      break;
    }
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const prices = rows.map((r) => Math.round(Number(r[1]))).filter((p) => p > 1000);
  const perSqm = rows
    .map((r) => Number(r[1]) / Number(r[2]))
    .filter((v) => Number.isFinite(v) && v > 100 && v < 100000);
  return {
    title: `Sold ${flat ? "apartments" : "houses"} in ${commune.nom}, ${year}`,
    summary: `${prices.length} recorded sales${perSqm.length ? `, median ${Math.round(median(perSqm) ?? 0).toLocaleString()} EUR per sq m` : ""}.`,
    currency: "EUR",
    median: median(prices),
    rows: rows.slice(0, 5).map((r) => ({
      label: r[4] || commune.nom,
      price: Math.round(Number(r[1])),
      detail: `${r[0]}${r[2] ? ` · ${r[2]} sq m` : ""}${r[3] ? ` · ${r[3]} rooms` : ""}`,
    })),
    source: "Demandes de valeurs foncières (DVF), DGFiP, via data.gouv.fr, Licence Ouverte 2.0.",
    sourceUrl: "https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres-geolocalisees/",
  };
}

// --- 2c. England & Wales Price Paid -----------------------------------------

const UK_POSTCODE = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d)[A-Z]{2}\b/i;

async function englandWales(subject: Subject): Promise<CompareBlock | null> {
  if (!/united kingdom|england|wales|\buk\b/i.test(subject.location)) return null;
  let meta: Record<string, unknown> = {};
  try {
    meta = subject.metadata ? (JSON.parse(subject.metadata) as Record<string, unknown>) : {};
  } catch {
    meta = {};
  }
  const match = UK_POSTCODE.exec(`${subject.location} ${typeof meta.postcode === "string" ? meta.postcode : ""}`);
  if (!match) return null;
  const sector = `${match[1].toUpperCase()} ${match[2]}`;
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 2).toISOString().slice(0, 10);
  const query = `PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?price ?date ?paon ?street ?pc WHERE {
  ?addr lrcommon:postcode ?pc .
  FILTER(STRSTARTS(?pc, "${sector}"))
  ?tx lrppi:propertyAddress ?addr ; lrppi:pricePaid ?price ; lrppi:transactionDate ?date .
  FILTER(?date >= "${since}"^^xsd:date)
  OPTIONAL { ?addr lrcommon:paon ?paon } OPTIONAL { ?addr lrcommon:street ?street }
} ORDER BY DESC(?date) LIMIT 60`;
  const url = `https://landregistry.data.gov.uk/landregistry/query?output=json&query=${encodeURIComponent(query)}`;
  const data = await fetchJson<{ results?: { bindings?: Record<string, { value: string }>[] } }>(url);
  const bindings = data.results?.bindings ?? [];
  if (bindings.length === 0) return null;
  const prices = bindings.map((b) => Number(b.price?.value)).filter(Number.isFinite);
  return {
    title: `Sold prices in postcode sector ${sector}`,
    summary: `${bindings.length} sales in the last two years.`,
    currency: "GBP",
    median: median(prices),
    rows: bindings.slice(0, 5).map((b) => ({
      label: [b.paon?.value, b.street?.value].filter(Boolean).join(" ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) || b.pc?.value || sector,
      price: Number(b.price?.value),
      detail: `${b.date?.value ?? ""} · ${b.pc?.value ?? ""}`,
    })),
    source: "Contains HM Land Registry data © Crown copyright and database right. Licensed under the Open Government Licence v3.0.",
    sourceUrl: "https://www.gov.uk/government/collections/price-paid-data",
  };
}

// --- All together ------------------------------------------------------------

export async function comparePrices(id: number): Promise<CompareBlock[]> {
  const subject = await prisma.property.findUnique({
    where: { id },
    select: { id: true, title: true, price: true, currency: true, location: true, propertyType: true, bedrooms: true, builtUp: true, metadata: true },
  });
  if (!subject) return [];
  // Official records are sale prices, so rentals compare with other rentals only.
  if (isRental(subject.metadata)) {
    const nearby = await nearbyListings(subject).catch(() => null);
    return nearby ? [nearby] : [];
  }
  const settled = await Promise.allSettled([
    singaporeHdb(subject),
    franceDvf(subject),
    englandWales(subject),
    nearbyListings(subject),
  ]);
  return settled.flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []));
}
