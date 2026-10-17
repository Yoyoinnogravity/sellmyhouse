import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/developerAccess";
import { LEAD_PRICE_MYR, LEAD_SLOTS, leadAlertText, unlockReference } from "@/lib/leads";
import { priceLabel } from "@/lib/listingImage";
import { prisma } from "@/lib/prisma";
import { samePlace } from "@/lib/region";
import { getUserFromCookie } from "@/lib/session";
import { siteById } from "@/lib/site";
import LeadDesk from "./lead-desk";

export const instant = false;

// Your desk. New sellers, the agents you can tell, and the transfers to confirm.
export default async function LeadsAdminPage() {
  const user = await getUserFromCookie();
  if (!user) {
    redirect("/login?next=%2Fleads");
  }
  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const [leads, agents] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { id: "desc" },
      take: 100,
      include: {
        property: { select: { title: true, location: true, price: true, currency: true } },
        unlocks: {
          orderBy: { id: "asc" },
          include: { agent: { select: { name: true, agency: true, phone: true } } },
        },
      },
    }),
    prisma.agent.findMany({
      where: { isAvailable: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, agency: true, phone: true, country: true, city: true },
    }),
  ]);

  const rows = leads.map((lead) => {
    const label = priceLabel(lead.property.currency, lead.property.price);
    const local = agents.filter(
      (agent) => samePlace(agent.country, lead.country) && samePlace(agent.city, lead.city),
    );
    return {
      id: lead.id,
      propertyId: lead.propertyId,
      title: lead.property.title,
      location: lead.property.location,
      priceLabel: label,
      status: lead.status,
      createdAt: lead.createdAt.toISOString(),
      siteName: siteById(lead.site).name,
      seller: { name: lead.sellerName, phone: lead.sellerPhone, email: lead.sellerEmail },
      alert: leadAlertText({
        id: lead.id,
        title: lead.property.title,
        location: lead.property.location,
        priceLabel: label,
        site: lead.site,
      }),
      agents: local.map((agent) => ({
        id: agent.id,
        name: agent.name,
        agency: agent.agency,
        phone: agent.phone,
        unlock: lead.unlocks.find((unlock) => unlock.agentId === agent.id)?.status ?? null,
      })),
      unlocks: lead.unlocks.map((unlock) => ({
        id: unlock.id,
        status: unlock.status,
        priceMyr: unlock.priceMyr,
        reference: unlockReference(lead.id, unlock.agentId),
        agent: unlock.agent,
      })),
      paidCount: lead.unlocks.filter((unlock) => unlock.status === "paid").length,
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Seller leads</h1>
      <p className="max-w-xl">
        Sellers from all four sites who ticked &ldquo;let realtors contact me&rdquo;. Tell the agents
        in that town, then mark each transfer paid when it lands. RM {LEAD_PRICE_MYR} per agent,{" "}
        {LEAD_SLOTS} agents per seller.
      </p>
      <LeadDesk initial={rows} />
    </main>
  );
}
