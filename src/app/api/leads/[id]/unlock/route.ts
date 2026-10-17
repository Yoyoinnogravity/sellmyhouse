import { NextResponse } from "next/server";
import { getAgentFromCookie } from "@/lib/agent";
import { LEAD_PRICE_MYR, LEAD_SLOTS, leadsForAgent, unlockReference } from "@/lib/leads";
import { notifyRequest } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { samePlace } from "@/lib/region";

// An agent asks for a seller's number. This records the request and shows
// bank details; the number is released when the admin marks it paid.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAgentFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Log in as a realtor." }, { status: 401 });
  }

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) {
    return NextResponse.json({ error: "Unknown seller." }, { status: 404 });
  }

  const [agent, lead] = await Promise.all([
    prisma.agent.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, agency: true, phone: true, email: true, country: true, city: true },
    }),
    prisma.lead.findUnique({
      where: { id: leadId },
      include: { unlocks: { select: { agentId: true, status: true } } },
    }),
  ]);
  if (!agent || !lead) {
    return NextResponse.json({ error: "Unknown seller." }, { status: 404 });
  }
  if (!samePlace(lead.country, agent.country) || !samePlace(lead.city, agent.city ?? "")) {
    return NextResponse.json({ error: "This seller is outside your town." }, { status: 403 });
  }
  if (lead.status !== "open") {
    return NextResponse.json({ error: "This seller is no longer looking." }, { status: 400 });
  }
  const paid = lead.unlocks.filter((unlock) => unlock.status === "paid").length;
  if (paid >= LEAD_SLOTS) {
    return NextResponse.json({ error: "Three realtors already have this seller." }, { status: 400 });
  }
  if (!lead.unlocks.some((unlock) => unlock.agentId === agent.id)) {
    await prisma.leadUnlock.create({
      data: { leadId: lead.id, agentId: agent.id, priceMyr: LEAD_PRICE_MYR },
    });
    await notifyRequest({
      kind: "lead-unlock",
      subject: `${agent.name} wants seller lead ${lead.id} · RM ${LEAD_PRICE_MYR} · ${unlockReference(lead.id, agent.id)}`,
      lines: [
        `Agent: ${agent.name}, ${agent.agency} · ${agent.phone} · ${agent.email}`,
        `Seller: ${lead.sellerName} in ${lead.city}, ${lead.country}`,
        `Waiting for a bank transfer of RM ${LEAD_PRICE_MYR} with reference ${unlockReference(lead.id, agent.id)}.`,
        `Mark it paid on the desk at /leads once it lands.`,
      ],
    });
  }

  const refreshed = (await leadsForAgent(agent)).find((item) => item.id === lead.id);
  return NextResponse.json({ lead: refreshed });
}
