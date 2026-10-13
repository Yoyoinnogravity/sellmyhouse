import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getAgentById } from "@/lib/agent";

export const instant = false;

export default async function AgentProfilePage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  await connection();
  const { country } = await params;
  const agentId = Number(country);
  if (!Number.isInteger(agentId)) {
    notFound();
  }

  const agent = await getAgentById(agentId);
  if (!agent) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{agent.name}</h1>
      <p>{agent.agency}</p>
      {agent.city ? <p>{agent.city}</p> : null}
      <p>{agent.country}</p>
      <p>{agent.phone}</p>
      <p>{agent.email}</p>
      {agent.license ? <p>{agent.license}</p> : null}
      {agent.website ? <p>{agent.website}</p> : null}
      <section className="flex flex-col gap-4">
        <h2>Listings</h2>
        {agent.properties.length === 0 ? (
          <p>No listings yet.</p>
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
    </main>
  );
}
