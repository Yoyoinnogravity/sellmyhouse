import { prisma } from "@/lib/prisma";
import { propertyRegion, samePlace } from "@/lib/region";
import { priceLabel } from "@/lib/listingImage";
import { notifyRequest } from "@/lib/notify";
import { siteById, type SiteId } from "@/lib/site";

// What an agent pays for one seller's number, and how many agents may buy it.
export const LEAD_PRICE_MYR = 80;
export const LEAD_SLOTS = 3;

export type UnlockState = "available" | "requested" | "paid" | "taken" | "closed";

export type AgentLead = {
  id: number;
  propertyId: number;
  title: string;
  location: string;
  priceLabel: string;
  createdAt: string;
  siteName: string;
  siteHost: string;
  priceMyr: number;
  slotsLeft: number;
  state: UnlockState;
  reference: string | null;
  seller: { name: string; phone: string; email: string | null } | null;
};

export function bankDetails() {
  return (
    (process.env.LEAD_BANK_DETAILS ?? "").trim() ||
    "Bank details not set yet. Add LEAD_BANK_DETAILS to the environment."
  );
}

export function unlockReference(leadId: number, agentId: number) {
  return `LEAD-${leadId}-${agentId}`;
}

// Short text you can paste into WhatsApp to tell an agent a seller is waiting.
// Named for the brand the seller used, so a condo seller reads as one.
export function leadAlertText(lead: {
  id: number;
  title: string;
  location: string;
  priceLabel: string;
  site: string;
}) {
  const site = siteById(lead.site);
  return [
    `New ${site.noun} seller on ${site.host}.`,
    `${lead.title}, ${lead.location}, ${lead.priceLabel}.`,
    `They have asked for realtors to contact them.`,
    `RM ${LEAD_PRICE_MYR} for the number. Log in at https://${site.host}/agents/dashboard (lead ${lead.id}).`,
  ].join("\n");
}

export async function createLeadForProperty(input: {
  propertyId: number;
  location: string;
  site: SiteId;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}) {
  const region = propertyRegion(input.location);
  if (!region || !input.contactName || !input.contactPhone) return null;
  const lead = await prisma.lead.create({
    data: {
      propertyId: input.propertyId,
      sellerName: input.contactName,
      sellerPhone: input.contactPhone,
      sellerEmail: input.contactEmail,
      city: region.city,
      country: region.country,
      site: input.site,
    },
    select: { id: true },
  });
  const site = siteById(input.site);
  await notifyRequest({
    kind: "lead",
    subject: `New seller in ${region.city} wants a realtor (lead ${lead.id})`,
    lines: [
      `Site: ${site.host}`,
      `Listing: https://${site.host}/property/${input.propertyId}`,
      `Location: ${input.location}`,
      `Seller: ${input.contactName} · ${input.contactPhone}${input.contactEmail ? ` · ${input.contactEmail}` : ""}`,
      `Desk: https://${site.host}/leads`,
    ],
  });
  return lead;
}

// Open sellers in the agent's town, with this agent's position on each.
export async function leadsForAgent(agent: {
  id: number;
  country: string;
  city: string | null;
}): Promise<AgentLead[]> {
  if (!agent.city) return [];
  const leads = await prisma.lead.findMany({
    orderBy: { id: "desc" },
    take: 100,
    include: {
      property: { select: { title: true, location: true, price: true, currency: true } },
      unlocks: { select: { agentId: true, status: true } },
    },
  });

  return leads
    .filter((lead) => samePlace(lead.country, agent.country) && samePlace(lead.city, agent.city ?? ""))
    .map((lead) => {
      const paid = lead.unlocks.filter((unlock) => unlock.status === "paid");
      const mine = lead.unlocks.find((unlock) => unlock.agentId === agent.id);
      const slotsLeft = Math.max(0, LEAD_SLOTS - paid.length);
      const site = siteById(lead.site);
      const state: UnlockState =
        mine?.status === "paid"
          ? "paid"
          : mine?.status === "requested"
            ? "requested"
            : lead.status !== "open"
              ? "closed"
              : slotsLeft === 0
                ? "taken"
                : "available";
      return {
        id: lead.id,
        propertyId: lead.propertyId,
        title: lead.property.title,
        location: lead.property.location,
        priceLabel: priceLabel(lead.property.currency, lead.property.price),
        createdAt: lead.createdAt.toISOString(),
        siteName: site.name,
        siteHost: site.host,
        priceMyr: LEAD_PRICE_MYR,
        slotsLeft,
        state,
        reference: mine ? unlockReference(lead.id, agent.id) : null,
        seller:
          state === "paid"
            ? { name: lead.sellerName, phone: lead.sellerPhone, email: lead.sellerEmail }
            : null,
      };
    });
}
