import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { listAvailableAgentsInRegion } from "@/lib/agent";
import { realtorRegisterPath } from "@/lib/region";

export const instant = false;

export default async function AgentsByRegionPage({
  params,
}: {
  params: Promise<{ country: string; city: string }>;
}) {
  await connection();
  const { country, city } = await params;
  const regionCountry = decodeSegment(country);
  const regionCity = decodeSegment(city);
  if (!regionCountry || !regionCity) {
    notFound();
  }

  const agents = await listAvailableAgentsInRegion(regionCountry, regionCity);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Agents in {regionCity}, {regionCountry}
      </h1>
      {agents.length === 0 ? (
        <p>
          No realtors registered for this region.{" "}
          <Link href={realtorRegisterPath({ city: regionCity, country: regionCountry })}>
            Add your details and region
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {agents.map((agent) => (
            <li key={agent.id}>
              <Link href={`/agents/${agent.id}`}>{agent.name}</Link>
              <p>{agent.agency}</p>
              <p>{[agent.city, agent.country].filter(Boolean).join(", ")}</p>
              <p>{agent.phone}</p>
              <p>{agent.email}</p>
              {agent.license ? <p>{agent.license}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}
