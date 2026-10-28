import { currencyForLocation } from "@/lib/currency";
import { readDeal, rentalMetadata } from "@/lib/rental";
import { APLS } from "@/lib/propertyStandard";

// Reads listing files from sellers and realtors anywhere in the world.
// The aim is that almost any spreadsheet of properties uploads as-is:
// column names are matched loosely ("Asking Price", "asking_price" and
// "price" all work), only price and location are required (a latitude and
// longitude is enough for location), and columns we don't recognise are
// kept as extra details on the listing instead of being rejected.
// The published template is /listing-template.csv (see /listing-format).

export type UploadMode = "json" | "csv" | "manual" | "bulk";

export class UploadParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadParseError";
  }
}

const AGENT_FIELDS = ["name", "agency", "phone", "email", "country"] as const;

// Normalised header (lowercase letters and digits only) → standard field.
const ALIASES: Record<string, string> = {};
function alias(field: string, ...names: string[]) {
  for (const name of [field, ...names]) ALIASES[name.toLowerCase().replace(/[^a-z0-9]/g, "")] = field;
}
alias("title", "headlineoptional", "headline", "listingtitle", "propertytitle", "propertyname", "listingname");
alias("price", "askingprice", "saleprice", "listprice", "listingprice", "sellingprice");
alias("currency", "currencycode", "ccy");
alias("location", "whereisit", "locationtowncountry", "towncountry", "fulladdress", "locationtext");
alias("address", "streetaddress", "street", "address1", "addressline1");
alias("city", "town", "suburb", "area", "district", "neighbourhood", "neighborhood");
alias("state", "region", "province", "county", "prefecture");
alias("postcode", "postalcode", "zip", "zipcode");
alias("country", "countrycode", "nation");
alias("latitude", "lat");
alias("longitude", "lng", "lon", "long");
alias("propertyType", "type", "category", "kind", "propertykind");
alias("bedrooms", "beds", "bedroom", "bed", "br", "bedroomcount");
alias("bathrooms", "baths", "bathroom", "bath", "ba", "bathroomcount");
alias("builtUp", "builtupsize", "builtuparea", "floorarea", "floorsize", "internalarea", "livingarea", "size", "builtupsqft", "builtupsqm");
alias("landSize", "landarea", "lotsize", "plotsize", "lotarea", "plotarea", "landsqft", "landsqm");
alias("areaUnit", "unit", "sizeunit", "areaunits");
alias("tenure", "ownership", "titletype", "freeholdleasehold");
alias("description", "details", "remarks", "summary", "notes", "about");
alias("images", "photolinks", "photolink", "imageurls", "photos", "photourls", "pictures", "image", "photo", "imageurl", "photourl", "pictureurls");
alias("contactName", "yourname", "sellersname", "sellername", "ownername", "name", "agentname", "contact");
alias("contactPhone", "phoneorwhatsapp", "yourphone", "phone", "mobile", "whatsapp", "sellerphone", "agentphone", "tel", "telephone", "phonenumber");
alias("contactEmail", "youremail", "email", "selleremail", "agentemail", "emailaddress");
alias("agency", "agencyname", "company", "brokerage", "agentcompany", "realestateagency");
alias("listingUrl", "url", "link", "listinglink", "weblink");
alias("reference", "ref", "referenceid", "listingid", "externalid", "mlsnumber", "mls", "propertyid");
alias("deal", "listingtype", "forsaleorrent", "saleorrent", "sellorrent", "forsaleorforrent", "transactiontype", "offertype", "listingfor");
alias("monthlyRent", "monthlyrent", "rentpermonth", "rentalprice", "rentmonthly", "rent");
alias("deposit", "securitydeposit", "depositamount");
alias("furnished", "furnishing", "furnishedornot");
alias("availableFrom", "availablefrom", "available", "availabledate", "moveindate");
alias("minLease", "minimumlease", "minimumleasemonths", "minleasemonths", "leaseterm", "minimumtenancy");
alias("contactType", "contacttype");
alias("source");
alias("agentId", "agentid");

const MAX_METADATA = 1800;

export function isUploadMode(value: unknown): value is UploadMode {
  return value === "json" || value === "csv" || value === "manual" || value === "bulk";
}

export function parseUploadBody(input: unknown): {
  mode: UploadMode;
  source: unknown;
  agent: unknown;
  properties: unknown[];
} {
  if (Array.isArray(input)) {
    const parsed = parseListingDocument(input);
    return { mode: "json", source: undefined, agent: parsed.agent, properties: parsed.properties };
  }

  const record = asRecord(input);
  if (!record) throw new UploadParseError("Send a CSV, Excel or JSON file.");

  if (record.mode != null && record.mode !== "" && !isUploadMode(record.mode)) {
    throw new UploadParseError("Choose JSON, CSV, manual entry, or bulk upload.");
  }

  const formAgent = presentAgent(record.agent);

  if (Array.isArray(record.rows)) {
    const parsed = parseListingDocument(rowsToRecords(record.rows as unknown[][]));
    return {
      mode: isUploadMode(record.mode) ? record.mode : "csv",
      source: record.source,
      agent: formAgent ?? parsed.agent,
      properties: parsed.properties,
    };
  }

  const payload = typeof record.payload === "string" ? record.payload.trim() : "";
  const mode = inferMode(record.mode, payload, hasListingFields(record));

  if (payload) {
    const parsed = parsePayload(payload, mode);
    return { mode, source: record.source, agent: formAgent ?? parsed.agent, properties: parsed.properties };
  }

  const propertiesValue = parsePropertiesField(record.properties);
  if (Array.isArray(propertiesValue)) {
    const parsed = parseListingDocument(propertiesValue);
    return { mode, source: record.source, agent: formAgent ?? parsed.agent, properties: parsed.properties };
  }

  if (hasListingFields(record)) {
    return { mode, source: record.source, agent: formAgent, properties: [normalizeListing(record)] };
  }

  throw new UploadParseError("Add at least one listing.");
}

function parsePayload(payload: string, mode: UploadMode): { agent: unknown; properties: unknown[] } {
  const text = payload.replace(/^﻿/, "").trim();
  if (!text) throw new UploadParseError("Add at least one listing.");
  if (text.length > 2_000_000) throw new UploadParseError("That file is too large.");

  const looksJson = text.startsWith("{") || text.startsWith("[");
  if (mode === "csv" || !looksJson) return parseListingDocument(csvToRecords(text));

  try {
    return parseListingDocument(JSON.parse(text) as unknown);
  } catch (error) {
    if (error instanceof UploadParseError) throw error;
    throw new UploadParseError("The JSON could not be read.");
  }
}

function parsePropertiesField(value: unknown): unknown {
  if (typeof value !== "string" || !value.trim()) return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new UploadParseError("The listings could not be read.");
  }
}

export function parseListingDocument(value: unknown): { agent: unknown; properties: unknown[] } {
  if (Array.isArray(value)) {
    const items = value.filter((item) => {
      const record = asRecord(item);
      return !record || Object.values(record).some((entry) => entry != null && String(entry).trim() !== "");
    });
    if (items.length > APLS.batchMax) {
      throw new UploadParseError(
        `One upload can include at most ${APLS.batchMax} listings. Please split the file.`,
      );
    }
    return {
      agent: null,
      properties: items.map((item) => {
        const record = asRecord(item);
        return record ? normalizeListing(record) : item;
      }),
    };
  }

  const record = asRecord(value);
  if (!record) throw new UploadParseError("The upload must be a JSON object or array.");

  const list = Array.isArray(record.properties)
    ? record.properties
    : Array.isArray(record.listings)
      ? record.listings
      : null;
  if (list) {
    const parsed = parseListingDocument(list);
    return { agent: presentAgent(record.agent ?? agentFromRecord(record)), properties: parsed.properties };
  }

  if (hasListingFields(record)) return { agent: null, properties: [normalizeListing(record)] };
  throw new UploadParseError("Add at least one listing.");
}

// --- One row → one listing in the standard's own field names -------------

export function normalizeListing(raw: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const extras: Record<string, string | number | boolean> = {};
  const images: string[] = [];

  for (const [key, value] of Object.entries(raw)) {
    if (value == null || (typeof value === "string" && value.trim() === "")) continue;
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    // image1, photo_2, Picture 3 …
    if (/^(image|photo|picture)\d+$/.test(normalized) || /^(image|photo|picture)url\d+$/.test(normalized)) {
      images.push(...splitImages(value));
      continue;
    }
    const field = ALIASES[normalized];
    if (field === "images") {
      images.push(...splitImages(value));
    } else if (field === "metadata" || key === "metadata") {
      const meta = asRecord(value);
      if (meta) for (const [k, v] of Object.entries(meta)) addExtra(extras, k, v);
    } else if (field) {
      if (fields[field] == null) fields[field] = value;
    } else if (key === "agent" && asRecord(value)) {
      // Nested agent objects from the older JSON format.
      const agent = asRecord(value)!;
      fields.agency ??= agent.agency;
      fields.contactName ??= agent.name;
      fields.contactPhone ??= agent.phone;
      fields.contactEmail ??= agent.email;
      fields.country ??= agent.country;
    } else {
      addExtra(extras, key, value);
    }
  }

  const listing: Record<string, unknown> = {};
  const text = (field: string) => (fields[field] == null ? "" : String(fields[field]).trim());

  // Price, and a currency read from the price when no currency column is given.
  // A rent column, or "rent" in the sale-or-rent column, makes it a rental.
  const rental = readDeal(fields.deal) === "rent" || (fields.monthlyRent != null && fields.price == null);
  const priceText = text("price") || text("monthlyRent");
  const price = readPrice(priceText);
  listing.price = price ?? (priceText || undefined);
  listing.currency = text("currency") || currencyFromPrice(priceText) || undefined;

  // Location: given directly, built from address parts, or from the pin.
  const lat = readCoordinate(fields.latitude, 90);
  const lng = readCoordinate(fields.longitude, 180);
  const pinned = lat != null && lng != null;
  let location = text("location");
  if (!location) location = buildLocation([text("city"), text("state"), text("country")]) || text("address").slice(0, APLS.locationMax);
  if (!location && pinned) location = `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  listing.location = location;
  listing.currency ??= currencyForLocation(location) ?? undefined;
  if (pinned) {
    extras.lat = lat;
    extras.lng = lng;
  }
  if (text("address") && location !== text("address")) extras.address = text("address").slice(0, 200);
  if (text("postcode")) extras.postcode = text("postcode").slice(0, 20);
  if (text("country")) extras.country = text("country").slice(0, 80);

  listing.title = text("title");
  listing.propertyType = cleanType(text("propertyType"));
  listing.bedrooms = readCount(text("bedrooms"));
  listing.bathrooms = readCount(text("bathrooms"));

  const builtUp = readArea(text("builtUp"));
  const landSize = readArea(text("landSize"));
  listing.builtUp = builtUp.value;
  listing.landSize = landSize.value;
  const unit = readUnit(text("areaUnit")) ?? builtUp.unit ?? landSize.unit;
  if (unit) extras.areaUnit = unit;

  listing.tenure = text("tenure") || undefined;
  listing.description = text("description").slice(0, 2000) || undefined;
  const uniqueImages = [...new Set(images)].slice(0, 12);
  if (uniqueImages.length > 0) listing.images = uniqueImages;

  listing.contactName = text("contactName").slice(0, 80);
  listing.contactPhone = text("contactPhone");
  listing.contactEmail = text("contactEmail");
  const agency = text("agency");
  if (agency) {
    extras.contactRole = "realtor";
    extras.realtorAgency = agency.slice(0, 120);
  }
  if (rental) {
    Object.assign(
      extras,
      rentalMetadata({
        deposit: fields.deposit,
        furnished: fields.furnished,
        availableFrom: fields.availableFrom instanceof Date ? fields.availableFrom.toISOString() : fields.availableFrom,
        minLease: fields.minLease,
      }),
    );
    listing.saleType = "rent";
    listing.minLease = fields.minLease;
  }
  if (text("listingUrl")) extras.listingUrl = text("listingUrl").slice(0, 200);
  if (text("reference")) extras.reference = text("reference").slice(0, 80);

  if (fields.contactType != null) listing.contactType = fields.contactType;
  if (fields.source != null) listing.source = fields.source;
  if (fields.agentId != null) listing.agentId = fields.agentId;

  const metadata = fitMetadata(extras);
  if (metadata) listing.metadata = metadata;
  return listing;
}

function buildLocation(parts: string[]): string {
  const unique: string[] = [];
  for (const part of parts) {
    if (part && !unique.some((seen) => seen.toLowerCase() === part.toLowerCase())) unique.push(part);
  }
  while (unique.length > 1 && unique.join(", ").length > APLS.locationMax) unique.shift();
  return unique.join(", ").slice(0, APLS.locationMax);
}

// "RM 450,000" → 450000, "1.2m" → 1200000, "450k" → 450000,
// "1.250.000" → 1250000, "450000.00" → 450000.
export function readPrice(value: string): number | null {
  if (!value) return null;
  const lower = value.toLowerCase().replace(/\s+/g, "");
  const match = lower.match(/(\d[\d.,']*)(k|m|mil|million|mn|b|bn|billion)?\b/);
  if (!match) return null;
  let digits = match[1].replace(/'/g, "");
  if (/^\d{1,3}([.,]\d{3})+$/.test(digits)) digits = digits.replace(/[.,]/g, "");
  else if (/^\d+,\d{1,2}$/.test(digits)) digits = digits.replace(",", ".");
  else digits = digits.replace(/,/g, "");
  let amount = Number(digits);
  if (!Number.isFinite(amount)) return null;
  const scale = match[2];
  if (scale === "k") amount *= 1_000;
  else if (scale && scale.startsWith("m")) amount *= 1_000_000;
  else if (scale && scale.startsWith("b")) amount *= 1_000_000_000;
  const whole = Math.round(amount);
  return whole > 0 ? whole : null;
}

const CURRENCY_MARKS: [RegExp, string][] = [
  [/\bRM\b|^RM/i, "MYR"],
  [/S\$|\bSGD\b/i, "SGD"],
  [/A\$|\bAUD\b/i, "AUD"],
  [/HK\$|\bHKD\b/i, "HKD"],
  [/US\$|\bUSD\b/i, "USD"],
  [/£|\bGBP\b/i, "GBP"],
  [/€|\bEUR\b/i, "EUR"],
  [/฿|\bTHB\b/i, "THB"],
  [/₱|\bPHP\b/i, "PHP"],
  [/\bRp\b|^Rp|\bIDR\b/i, "IDR"],
  [/₹|\bINR\b/i, "INR"],
  [/₫|\bVND\b/i, "VND"],
  [/¥|\bJPY\b/i, "JPY"],
  [/\bAED\b/i, "AED"],
];

function currencyFromPrice(value: string): string | null {
  for (const [pattern, code] of CURRENCY_MARKS) if (pattern.test(value)) return code;
  const code = value.match(/\b([A-Z]{3})\b/);
  return code ? code[1] : null;
}

function readCoordinate(value: unknown, limit: number): number | null {
  if (value == null || String(value).trim() === "") return null;
  const number = Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(number) || Math.abs(number) > limit) return null;
  return Math.round(number * 1e6) / 1e6;
}

// "3", "3+1", "3 bedrooms" → 3. "Studio" → 0.
function readCount(value: string): number | string | undefined {
  if (!value) return undefined;
  if (/studio/i.test(value)) return 0;
  const match = value.match(/\d+(\.\d+)?/);
  return match ? Math.floor(Number(match[0])) : value;
}

function readArea(value: string): { value: number | string | undefined; unit: string | null } {
  if (!value) return { value: undefined, unit: null };
  const unit = readUnit(value);
  const match = value.replace(/,(?=\d{3}\b)/g, "").match(/\d+(\.\d+)?/);
  if (!match) return { value, unit };
  return { value: Math.round(Number(match[0])), unit };
}

function readUnit(value: string): string | null {
  const lower = value.toLowerCase();
  if (/sq\.?\s*m|sqm|m2|m²|square\s*met/.test(lower)) return "sq m";
  if (/sq\.?\s*f|sqft|ft2|ft²|square\s*f/.test(lower)) return "sq ft";
  if (/acre/.test(lower)) return "acres";
  if (/hectare|\bha\b/.test(lower)) return "hectares";
  return null;
}

// Common words are mapped to the types each brand site shows, so an
// uploaded "condo" appears on sellmycondo.asia and a "plot" on sellmyland.
const TYPE_WORDS: [RegExp, string][] = [
  [/condo/i, "Condominium"],
  [/serviced|service apartment|soho/i, "Soho"],
  [/apartment|\bapt\b|\bflat\b/i, "Apartment"],
  [/studio/i, "Studio"],
  [/town ?house/i, "Townhouse"],
  [/semi/i, "Semi-detached"],
  [/terrace|row ?house|link ?house/i, "Terrace"],
  [/bungalow/i, "Bungalow"],
  [/villa/i, "Villa"],
  [/detached|single[- ]family/i, "Detached"],
  [/cottage/i, "Cottage"],
  [/\bland\b|\bplot\b|\blot\b|acreage|farm|tanah/i, "Land"],
  [/house|home|residential/i, "House"],
];

function cleanType(value: string): string | undefined {
  if (!value) return undefined;
  for (const [pattern, type] of TYPE_WORDS) if (pattern.test(value)) return type;
  const cleaned = value.replace(/[^\p{L}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 40);
  if (cleaned.length < 2) return value;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function splitImages(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(splitImages);
  return String(value)
    .split(/[\s|;,]+(?=https?:\/\/)|\s*[|;\n]\s*|\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function addExtra(extras: Record<string, string | number | boolean>, key: string, value: unknown) {
  if (value == null) return;
  const words = key.replace(/[^A-Za-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return;
  let name = words
    .map((word, index) => (index === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("");
  if (!/^[A-Za-z]/.test(name)) name = `x${name}`;
  name = name.slice(0, 40);
  if (name in extras) return;
  if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) extras[name] = value;
  else if (typeof value !== "object") extras[name] = String(value).trim().slice(0, 200);
}

function fitMetadata(extras: Record<string, string | number | boolean>) {
  const kept: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(extras)) {
    kept[key] = value;
    if (JSON.stringify(kept).length > MAX_METADATA) delete kept[key];
  }
  return Object.keys(kept).length > 0 ? kept : null;
}

// --- Files ------------------------------------------------------------------

function csvToRecords(text: string): Record<string, string>[] {
  return rowsToRecords(parseCsv(text));
}

export function rowsToRecords(rows: unknown[][]): Record<string, string>[] {
  const cleaned = rows
    .map((row) => row.map((cell) => (cell == null ? "" : cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell))))
    .filter((row) => row.some((cell) => cell.trim() !== ""));
  if (cleaned.length < 2) {
    throw new UploadParseError("The file needs a header row and at least one listing.");
  }

  const headers = cleaned[0].map((header) => header.trim());
  const keys = headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const fields = keys.map((key) => ALIASES[key]);
  const hasPrice = fields.includes("price") || fields.includes("monthlyRent");
  const hasPlace = fields.some((field) =>
    ["location", "address", "city", "state", "country", "latitude"].includes(field ?? ""),
  );
  if (!hasPrice || !hasPlace) {
    throw new UploadParseError(
      "The file needs a price (or monthly rent) column and a location column (or latitude and longitude). Download the template to see the columns.",
    );
  }

  return cleaned.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, column) => {
      if (!header) return;
      const value = (row[column] ?? "").trim();
      if (value && !(header in record)) record[header] = value;
    });
    return record;
  });
}

function parseCsv(text: string): string[][] {
  const input = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = input.slice(0, input.indexOf("\n") === -1 ? undefined : input.indexOf("\n"));
  // Excel in much of Europe saves with semicolons; some tools use tabs.
  const counts = { ",": 0, ";": 0, "\t": 0 } as Record<string, number>;
  for (const char of firstLine) if (char in counts) counts[char] += 1;
  const delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"' && cell.trim() === "") {
      cell = "";
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (inQuotes) throw new UploadParseError("The CSV has an unclosed quote.");
  row.push(cell);
  rows.push(row);
  return rows;
}

// --- Agent details (signed-in realtors and the older upload format) --------

function agentFromRecord(record: Record<string, unknown>): Record<string, unknown> {
  if (record.agent && typeof record.agent === "object") return asRecord(record.agent) ?? {};
  return {
    name: record.name,
    agency: record.agency,
    phone: record.phone,
    email: record.email,
    country: record.country,
  };
}

function presentAgent(agent: unknown): Record<string, unknown> | null {
  const record = asRecord(agent);
  if (!record) return null;
  const hasValue = AGENT_FIELDS.some((field) => readString(record[field]) !== "");
  return hasValue ? record : null;
}

function hasListingFields(record: Record<string, unknown>): boolean {
  return ["title", "price", "location", "latitude", "lat"].some((field) => {
    const value = record[field];
    return value != null && String(value).trim() !== "";
  });
}

function inferMode(mode: unknown, payload: string, manualFields: boolean): UploadMode {
  if (isUploadMode(mode)) return mode;
  if (payload.startsWith("{") || payload.startsWith("[")) return "json";
  if (payload) return "csv";
  if (manualFields) return "manual";
  return "json";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
