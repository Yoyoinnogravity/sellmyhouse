import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+().\-\s]+$/;
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{0,79}$/u;
const firmPattern = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s&.'-]{0,119}$/u;
const countryPattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{1,79}$/u;
const cityPattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{1,79}$/u;
const licensePattern = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s-]{1,39}$/u;

export type PublicSolicitor = {
  id: number;
  name: string;
  firm: string;
  phone: string;
  email: string;
  country: string;
  city: string | null;
  license: string | null;
  createdAt: Date;
};

export type SolicitorProfile = PublicSolicitor & {
  properties: {
    id: number;
    title: string;
    price: number;
    location: string;
  }[];
};

export type SolicitorRegistration = {
  name: string;
  firm: string;
  phone: string;
  email: string;
  country: string;
  city: string | null;
  license: string | null;
};

export class SolicitorError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SolicitorError";
    this.status = status;
  }
}

const publicSolicitorSelect = {
  id: true,
  name: true,
  firm: true,
  phone: true,
  email: true,
  country: true,
  city: true,
  license: true,
  createdAt: true,
} as const;

export function validateSolicitorRegistration(
  input: unknown,
):
  | { ok: true; value: SolicitorRegistration }
  | { ok: false; error: string } {
  const record =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const name = readString(record.name);
  const firm = readString(record.firm);
  const phone = readString(record.phone);
  const email = readString(record.email).toLowerCase();
  const country = readString(record.country);
  const city = readOptional(record.city);
  const license = readOptional(record.license);
  const errors: string[] = [];

  if (!name || !namePattern.test(name)) errors.push("Enter the solicitor name.");
  if (!firm || !firmPattern.test(firm)) errors.push("Enter the firm name.");
  if (!isPhone(phone)) errors.push("Enter the solicitor phone number.");
  if (!email || !emailPattern.test(email)) {
    errors.push("Enter a valid solicitor email.");
  }
  if (!country || !countryPattern.test(country)) {
    errors.push("Enter the solicitor country.");
  }
  if (!city || !cityPattern.test(city)) errors.push("Enter your region.");
  if (license && !licensePattern.test(license)) {
    errors.push("Enter a license number.");
  }

  if (errors.length > 0) return { ok: false, error: errors.join(" ") };
  return {
    ok: true,
    value: { name, firm, phone, email, country, city, license },
  };
}

const placeReplacements: [string, string][] = [
  ["wilayah persekutuan kuala lumpur", "kuala lumpur"],
  ["wilayah persekutuan putrajaya", "putrajaya"],
  ["wp kuala lumpur", "kuala lumpur"],
  ["wp putrajaya", "putrajaya"],
  ["pulau pinang", "penang"],
  ["seberang perai", "seberang prai"],
  ["johore", "johor"],
  ["georgetown", "george town"],
  ["malacca", "melaka"],
];

const stateLabels: Record<string, string> = {
  "kuala lumpur": "Kuala Lumpur",
  "negeri sembilan": "Negeri Sembilan",
  penang: "Penang",
  johor: "Johor",
  selangor: "Selangor",
  perak: "Perak",
  melaka: "Melaka",
  kedah: "Kedah",
  kelantan: "Kelantan",
  pahang: "Pahang",
  perlis: "Perlis",
  terengganu: "Terengganu",
  putrajaya: "Putrajaya",
};

const states = Object.keys(stateLabels);

export function conveyancerPlace(location: string) {
  const place = normalizePlace(location);
  const state = states.find((name) => place.includes(name));
  return state ? stateLabels[state] : "";
}

export async function listSolicitors(location = ""): Promise<PublicSolicitor[]> {
  const solicitors = await prisma.solicitor.findMany({
    orderBy: [{ country: "asc" }, { city: "asc" }, { name: "asc" }],
    select: publicSolicitorSelect,
  });
  const needle = location.trim();
  if (!needle) return solicitors;

  const ranked = solicitors
    .map((solicitor) => ({ solicitor, score: localityScore(solicitor, needle) }))
    .filter((entry) => entry.score > 0);
  if (ranked.length === 0) return [];

  const best = Math.max(...ranked.map((entry) => entry.score));
  return ranked
    .filter((entry) => entry.score === best)
    .map((entry) => entry.solicitor);
}

export async function getSolicitorById(
  id: number,
): Promise<SolicitorProfile | null> {
  const solicitor = await prisma.solicitor.findUnique({
    where: { id },
    select: publicSolicitorSelect,
  });
  if (!solicitor) return null;

  const properties = await prisma.property.findMany({
    where: { solicitorId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      price: true,
      location: true,
    },
  });

  return { ...solicitor, properties };
}

export async function createSolicitorAccount(input: SolicitorRegistration) {
  const existing = await lookupSolicitorByEmail(input.email);
  if (existing) {
    throw new SolicitorError("A solicitor with that email already exists.", 409);
  }

  return prisma.solicitor.create({
    data: {
      name: input.name,
      firm: input.firm,
      phone: input.phone,
      email: input.email,
      country: input.country,
      city: input.city,
      license: input.license,
    },
    select: publicSolicitorSelect,
  }).catch((error: unknown) => {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new SolicitorError(
        "A solicitor with that email already exists.",
        409,
      );
    }
    throw error;
  });
}

export async function findSolicitorByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!emailPattern.test(normalized)) {
    throw new SolicitorError("Enter a valid email address.", 400);
  }

  const solicitor = await lookupSolicitorByEmail(normalized);
  if (!solicitor) {
    throw new SolicitorError("No solicitor with that email.", 401);
  }
  return solicitor;
}

function lookupSolicitorByEmail(email: string) {
  return prisma.solicitor.findFirst({
    where: { email: email.trim().toLowerCase() },
    orderBy: { id: "asc" },
    select: publicSolicitorSelect,
  });
}

function localityScore(
  solicitor: { country: string; city: string | null },
  location: string,
) {
  const place = normalizePlace(location);
  const city = normalizePlace(solicitor.city ?? "");
  const country = normalizePlace(solicitor.country);
  const town = city.split(",")[0]?.trim() ?? "";
  if (matchesTown(place, town)) return 3;

  const stateMatch = states.some(
    (state) => place.includes(state) && (city.includes(state) || country === state),
  );
  if (stateMatch) return 2;

  if (country.length > 2 && (place.includes(country) || country.includes(place))) {
    return 1;
  }
  return 0;
}

function matchesTown(place: string, town: string) {
  if (town.length < 4 || states.includes(town)) return false;
  const segments = place.split(",").map((segment) => segment.trim());
  if (segments.some((segment) => segment === town || segment.startsWith(`${town} `))) {
    return true;
  }
  const words = town.split(" ").filter(Boolean);
  return words.length >= 2 && segments.some((segment) => segment.includes(town));
}

function normalizePlace(value: string) {
  let place = value.toLowerCase();
  for (const [from, to] of placeReplacements) {
    place = place.replaceAll(from, to);
  }
  return place.replace(/[^a-z\s,]/g, " ").replace(/\s+/g, " ").trim();
}

function readString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isInteger(value)) return String(value);
  return "";
}

function readOptional(value: unknown) {
  const text = readString(value);
  return text || null;
}

function isPhone(value: string) {
  const digits = value.replace(/\D/g, "").length;
  return value.length <= 30 && digits >= 6 && phonePattern.test(value);
}
