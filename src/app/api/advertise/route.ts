import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const SITE_OPTIONS = [
  "sellmyhouse.asia",
  "sellmycondo.asia",
  "sellmyland.asia",
  "sellmybungalow.asia",
];

const PLACEMENT_OPTIONS = ["Homepage banner", "Listing pages", "Property pages"];
const DURATION_OPTIONS = ["1 month", "3 months", "6 months", "12 months"];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+().\-\s]+$/;
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{0,79}$/u;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = text(record.name);
  const company = text(record.company).slice(0, 120);
  const email = text(record.email).toLowerCase();
  const phone = text(record.phone);
  const sites = Array.isArray(record.sites)
    ? [...new Set(record.sites.filter((site): site is string => typeof site === "string"))]
    : [];
  const placement = text(record.placement);
  const duration = text(record.duration);
  const budget = text(record.budget).slice(0, 120);
  const message = text(record.message).slice(0, 2000);

  if (!name || !namePattern.test(name)) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }
  if (!company) {
    return NextResponse.json({ error: "Enter your company." }, { status: 400 });
  }
  if (!email || email.length > 120 || !emailPattern.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (!phone || phone.length > 30 || !phonePattern.test(phone) || phone.replace(/\D/g, "").length < 6) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }
  if (sites.length === 0 || !sites.every((site) => SITE_OPTIONS.includes(site))) {
    return NextResponse.json({ error: "Choose at least one site." }, { status: 400 });
  }
  if (!PLACEMENT_OPTIONS.includes(placement)) {
    return NextResponse.json({ error: "Choose a placement." }, { status: 400 });
  }
  if (!DURATION_OPTIONS.includes(duration)) {
    return NextResponse.json({ error: "Choose a duration." }, { status: 400 });
  }
  if (record.agree !== true) {
    return NextResponse.json({ error: "Agree to the advertising terms to commit." }, { status: 400 });
  }

  const reference = `ADV-${Date.now().toString(36).toUpperCase()}`;
  const entry = {
    reference,
    name,
    company,
    email,
    phone,
    sites,
    placement,
    duration,
    budget: budget || null,
    message: message || null,
    agreedTerms: true,
    createdAt: new Date().toISOString(),
  };

  try {
    const directory = path.join(process.cwd(), "data");
    await mkdir(directory, { recursive: true });
    await appendFile(path.join(directory, "advertisers.jsonl"), `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    return NextResponse.json({ error: "Could not record this commitment." }, { status: 500 });
  }

  return NextResponse.json({ reference }, { status: 201 });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
