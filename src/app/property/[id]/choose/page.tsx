import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { propertyRegion, samePlace } from "@/lib/region";
import { getUserFromCookie } from "@/lib/session";
import { ChooseAgentForm } from "./choose-form";

export const instant = false;

export default async function ChooseAgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ agentId?: string | string[] }>;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const propertyId = Number(id);
  const agentId = Number(firstValue(query.agentId));
  if (!Number.isInteger(propertyId) || !Number.isInteger(agentId)) {
    notFound();
  }

  const [property, agent] = await Promise.all([
    prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        location: true,
        agent: { select: { isAvailable: true } },
      },
    }),
    prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        agency: true,
        city: true,
        country: true,
        phone: true,
        email: true,
        isAvailable: true,
      },
    }),
  ]);
  if (!property || !agent) {
    notFound();
  }

  const region = propertyRegion(property.location);
  const agentMatchesRegion =
    region != null &&
    agent.isAvailable &&
    samePlace(agent.country, region.country) &&
    samePlace(agent.city, region.city);
  if (!agentMatchesRegion) {
    notFound();
  }

  const returnPath = `/property/${property.id}/choose?agentId=${agent.id}`;
  const user = await getUserFromCookie();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Choose this agent</h1>
      {property.agent?.isAvailable ? (
        <p>This property already has an agent.</p>
      ) : (
        <>
          <p>
            Choose {agent.name} of {agent.agency} for {property.title}.
          </p>
          <p>{agent.city}</p>
          <p>{agent.phone}</p>
          <p>{agent.email}</p>
          <ChooseAgentForm propertyId={property.id} agentId={agent.id} />
        </>
      )}
      <p>
        <Link href={`/property/${property.id}`}>Back to the listing</Link>
      </p>
    </main>
  );
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
