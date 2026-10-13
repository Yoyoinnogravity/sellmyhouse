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
  if (city && !cityPattern.test(city)) errors.push("Enter a city.");
  if (license && !licensePattern.test(license)) {
    errors.push("Enter a license number.");
  }

  if (errors.length > 0) return { ok: false, error: errors.join(" ") };
  return {
    ok: true,
    value: { name, firm, phone, email, country, city, license },
  };
}

export async function listSolicitors(location = ""): Promise<PublicSolicitor[]> {
  const solicitors = await prisma.solicitor.findMany({
    orderBy: { name: "asc" },
    select: publicSolicitorSelect,
  });
  const needle = location.trim().toLowerCase();
  const localSolicitors = needle
    ? solicitors.filter((solicitor) => matchesLocation(solicitor, needle))
    : solicitors;
  return localSolicitors.length > 0 ? localSolicitors : solicitors;
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

function matchesLocation(
  solicitor: { country: string; city: string | null },
  needle: string,
) {
  const country = solicitor.country.toLowerCase();
  const city = solicitor.city?.toLowerCase() ?? "";
  return (
    country.includes(needle) ||
    needle.includes(country) ||
    (city !== "" && (city.includes(needle) || needle.includes(city)))
  );
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
