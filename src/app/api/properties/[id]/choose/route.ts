import { NextResponse } from "next/server";
import { notifyRequest } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { propertyRegion, samePlace } from "@/lib/region";
import { getUserFromCookie } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }

  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) {
    return NextResponse.json({ error: "Choose a property." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const agentValue =
    body && typeof body === "object"
      ? (body as { agentId?: unknown }).agentId
      : null;
  const agentId =
    typeof agentValue === "number" && Number.isInteger(agentValue)
      ? agentValue
      : null;
  if (agentId == null || agentId < 1) {
    return NextResponse.json({ error: "Choose an agent." }, { status: 400 });
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      title: true,
      location: true,
      agent: { select: { isAvailable: true } },
    },
  });
  if (!property) {
    return NextResponse.json({ error: "That property was not found." }, { status: 404 });
  }
  if (property.agent?.isAvailable) {
    return NextResponse.json(
      { error: "This property already has an agent." },
      { status: 409 },
    );
  }

  const region = propertyRegion(property.location);
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      isAvailable: true,
      name: true,
      agency: true,
      phone: true,
      email: true,
      country: true,
      city: true,
    },
  });
  if (
    !region ||
    !agent?.isAvailable ||
    !samePlace(agent.country, region.country) ||
    !samePlace(agent.city, region.city)
  ) {
    return NextResponse.json(
      { error: "That agent is not available in this region." },
      { status: 400 },
    );
  }

  await prisma.property.update({
    where: { id: property.id },
    data: {
      agentId: agent.id,
      contactType: "agent",
    },
  });

  await notifyRequest({
    kind: "choose-agent",
    subject: `Seller chose ${agent.name} for "${property.title}"`,
    lines: [
      `Seller account: ${user.email}`,
      `Agent: ${agent.name}, ${agent.agency} · ${agent.phone} · ${agent.email}`,
      `Listing: /property/${property.id} · ${property.location}`,
    ],
  });

  return NextResponse.json({ ok: true });
}
