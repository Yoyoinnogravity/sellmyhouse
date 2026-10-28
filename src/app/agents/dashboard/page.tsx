import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAgentById, requireAgent } from "@/lib/agent";
import { bankDetails, leadsForAgent } from "@/lib/leads";
import LeadList from "./lead-list";

export default function AgentDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Agent dashboard</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <AgentHome />
      </Suspense>
    </main>
  );
}

async function AgentHome() {
  const session = await requireAgent();
  const agent = await getAgentById(session.id);
  if (!agent) {
    redirect("/agents/login");
  }

  const leads = await leadsForAgent(agent);
  const town = agent.city ?? agent.country;

  return (
    <>
      <p>Signed in as {agent.name}</p>
      <p>{agent.agency}</p>
      <p>{agent.email}</p>
      <p className="flex gap-4">
        <Link href={`/agents/${agent.id}`}>View profile</Link>
        <Link href="/upload">Upload listings</Link>
      </p>
      <section className="flex flex-col gap-4">
        <h2>Sellers in {town} asking for a realtor</h2>
        <p className="max-w-xl text-sm text-zinc-600">
          These owners listed for free on Sell My House, Sell My Condo, Sell My Land, or Sell My
          Bungalow and ticked the box to hear from local realtors. The number goes to the first
          three who pay. No commission is taken.
        </p>
        <LeadList initial={leads} town={town} bank={bankDetails()} />
      </section>
      <section className="flex flex-col gap-4">
        <h2>Your listings</h2>
        {agent.properties.length === 0 ? (
          <p>You have no listings yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {agent.properties.map((property) => (
              <li key={property.id}>
                <Link href={`/property/${property.id}`}>{property.title}</Link>
                <p>{property.location}</p>
                <p>${property.price.toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
