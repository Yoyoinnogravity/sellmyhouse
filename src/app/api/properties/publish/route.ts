import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatFieldError, validateProperty } from "@/lib/propertyStandard";
import { getUserFromCookie } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const validated = validateProperty(body, {
    defaultSource: "manual",
    requireAgentId: true,
  });
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.errors.map(formatFieldError).join(" ") },
      { status: 400 },
    );
  }

  const listing = validated.value;
  const solicitor = await resolveSolicitorId(body);
  if (!solicitor.ok) {
    return NextResponse.json({ error: solicitor.error }, { status: 400 });
  }

  if (listing.contactType === "direct") {
    const property = await prisma.property.create({
      data: {
        title: listing.title,
        price: listing.price,
        location: listing.location,
        contactType: "direct",
        contactName: listing.contactName,
        contactPhone: listing.contactPhone,
        contactEmail: listing.contactEmail,
        source: "manual",
        agentId: null,
        solicitorId: solicitor.solicitorId,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: property.id }, { status: 201 });
  }

  if (listing.agentId == null) {
    return NextResponse.json(
      { error: "Choose an estate agent." },
      { status: 400 },
    );
  }

  const agent = await prisma.agent.findUnique({
    where: { id: listing.agentId },
    select: { id: true },
  });
  if (!agent) {
    return NextResponse.json(
      { error: "That estate agent is not available." },
      { status: 400 },
    );
  }

  const property = await prisma.property.create({
    data: {
      title: listing.title,
      price: listing.price,
      location: listing.location,
      contactType: "agent",
      contactName: null,
      contactPhone: null,
      contactEmail: null,
      source: "manual",
      agentId: agent.id,
      solicitorId: solicitor.solicitorId,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: property.id }, { status: 201 });
}

async function resolveSolicitorId(
  body: unknown,
): Promise<{ ok: true; solicitorId: number | null } | { ok: false; error: string }> {
  if (!body || typeof body !== "object" || !("solicitorId" in body)) {
    return { ok: true, solicitorId: null };
  }

  const value = (body as { solicitorId?: unknown }).solicitorId;
  if (value == null || value === "") {
    return { ok: true, solicitorId: null };
  }

  const solicitorId =
    typeof value === "number" && Number.isInteger(value)
      ? value
      : typeof value === "string" && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : null;
  if (solicitorId == null || solicitorId < 1) {
    return { ok: false, error: "Choose a solicitor." };
  }

  const selectedSolicitor = await prisma.solicitor.findUnique({
    where: { id: solicitorId },
    select: { id: true },
  });
  if (!selectedSolicitor) {
    return { ok: false, error: "That solicitor is not available." };
  }

  return { ok: true, solicitorId: selectedSolicitor.id };
}
