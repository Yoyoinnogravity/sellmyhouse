import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getAgentFromCookie } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import { RepresentForm } from "./represent-form";

export const instant = false;

export default async function RepresentPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) {
    notFound();
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      title: true,
      agent: { select: { isAvailable: true } },
    },
  });
  if (!property) {
    notFound();
  }

  const returnPath = `/property/${property.id}/represent`;
  const session = await getAgentFromCookie();
  if (!session) {
    redirect(`/agents/login?next=${encodeURIComponent(returnPath)}`);
  }

  const agent = await prisma.agent.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, isAvailable: true },
  });
  if (!agent) {
    redirect(`/agents/login?next=${encodeURIComponent(returnPath)}`);
  }

  const existing = await prisma.representationRequest.findUnique({
    where: {
      propertyId_agentId: {
        propertyId: property.id,
        agentId: agent.id,
      },
    },
    select: { id: true },
  });
  const hasAvailableAgent = property.agent?.isAvailable === true;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Request representation
      </h1>
      {hasAvailableAgent ? (
        <p>This property already has an agent.</p>
      ) : !agent.isAvailable ? (
        <p>Your agent profile is not available.</p>
      ) : existing ? (
        <p>
          You have already requested to represent the seller of {property.title}.
        </p>
      ) : (
        <>
          <p>
            {agent.name}, you are requesting to represent the seller of{" "}
            {property.title}.
          </p>
          <RepresentForm propertyId={property.id} />
        </>
      )}
      <p>
        <Link href={`/property/${property.id}`}>Back to the listing</Link>
      </p>
    </main>
  );
}
