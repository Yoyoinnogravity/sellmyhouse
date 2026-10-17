import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getAgentFromCookie } from "@/lib/agent";
import { notifyRequest } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) {
    return NextResponse.json({ error: "Choose a property." }, { status: 400 });
  }

  const session = await getAgentFromCookie();
  if (!session) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({
    where: { id: session.id },
    select: { id: true, isAvailable: true, name: true, agency: true, phone: true, email: true },
  });
  if (!agent) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }
  if (!agent.isAvailable) {
    return NextResponse.json(
      { error: "Your agent profile is not available." },
      { status: 403 },
    );
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

  try {
    await prisma.representationRequest.create({
      data: {
        propertyId: property.id,
        agentId: agent.id,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ ok: true, alreadyRequested: true });
    }
    console.error(error);
    return NextResponse.json(
      { error: "The request could not be saved." },
      { status: 500 },
    );
  }

  await notifyRequest({
    kind: "represent",
    subject: `${agent.name} asks to represent "${property.title}"`,
    lines: [
      `Agent: ${agent.name}, ${agent.agency} · ${agent.phone} · ${agent.email}`,
      `Listing: /property/${property.id} · ${property.location}`,
    ],
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
