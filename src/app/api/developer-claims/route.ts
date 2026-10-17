import { NextResponse } from "next/server";
import { isAdminEmail, parseListingIds } from "@/lib/developerAccess";
import { notifyRequest } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/lib/session";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+().\-\s]+$/;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Developers request ownership of their auto-imported listings.
// You approve each request before any edit access is granted.
export async function POST(request: Request) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const company = text(input.company, 120);
  const contactEmail = text(input.contactEmail, 120);
  const contactPhone = text(input.contactPhone, 30);
  const listingIds = parseListingIds(input.listingIds);

  if (company.length < 2) {
    return NextResponse.json({ error: "Enter your company name." }, { status: 400 });
  }
  if (contactEmail && !emailPattern.test(contactEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (contactPhone && (contactPhone.replace(/\D/g, "").length < 6 || !phonePattern.test(contactPhone))) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }
  if (!listingIds) {
    return NextResponse.json({ error: "Choose at least one listing." }, { status: 400 });
  }

  const existing = await prisma.property.findMany({
    where: { id: { in: listingIds }, claimedById: null },
    select: { id: true },
  });
  if (existing.length === 0) {
    return NextResponse.json({ error: "Those listings are already claimed." }, { status: 400 });
  }

  const claim = await prisma.developerClaim.create({
    data: {
      userId: user.id,
      company,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      listingIds: JSON.stringify(existing.map((row) => row.id)),
      status: "pending",
    },
    select: { id: true },
  });

  await notifyRequest({
    kind: "developer-claim",
    subject: `${company} asks to edit ${existing.length} listing(s) (claim ${claim.id})`,
    lines: [
      `Company: ${company}`,
      `Account: ${user.email}`,
      contactEmail && `Contact email: ${contactEmail}`,
      contactPhone && `Contact phone: ${contactPhone}`,
      `Listings: ${existing.map((row) => row.id).join(", ")}`,
      `Approve or reject at /developers/claims`,
    ],
  });

  return NextResponse.json({ id: claim.id }, { status: 201 });
}

// Pending queue for the admin, or your own requests.
export async function GET(request: Request) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }

  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "1";
  const admin = isAdminEmail(user.email);

  if (!admin && !mine) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const claims = await prisma.developerClaim.findMany({
    where: mine ? { userId: user.id } : { status: "pending" },
    orderBy: { id: "desc" },
    take: 100,
    select: {
      id: true,
      company: true,
      contactEmail: true,
      contactPhone: true,
      listingIds: true,
      status: true,
      createdAt: true,
      user: { select: { email: true } },
    },
  });

  return NextResponse.json({ items: claims });
}
