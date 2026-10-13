import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { listAvailableAgentsInRegion } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import { propertyRegion, regionPath } from "@/lib/region";
import { listSolicitors } from "@/lib/solicitor";
import { AgentProfileCard } from "./agent-profile-card";

export const instant = false;

export default async function PropertyPage({
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
    include: {
      agent: {
        select: {
          name: true,
          agency: true,
          phone: true,
          email: true,
          country: true,
          city: true,
          license: true,
          isAvailable: true,
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  const solicitor =
    property.solicitorId == null
      ? null
      : await prisma.solicitor.findUnique({
        where: { id: property.solicitorId },
        select: {
          id: true,
          name: true,
          firm: true,
          phone: true,
          email: true,
          country: true,
          city: true,
          license: true,
        },
      });

  const solicitors = await listSolicitors(property.location);
  const photos = listingImages(property.images, property.image);
  const details = listingDetails(property);
  const extra = readMetadata(property.metadata);
  const region = propertyRegion(property.location);
  const assignedAgent = property.agent;
  const agentIsAvailable = assignedAgent?.isAvailable === true;
  const regionalAgents =
    agentIsAvailable || !region
      ? []
      : await listAvailableAgentsInRegion(region.country, region.city, 6);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{property.title}</h1>
      {photos.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt=""
          width={1200}
          height={800}
          loading={index === 0 ? "eager" : "lazy"}
          className="h-auto w-full"
        />
      ))}
      <p>{property.location}</p>
      <p>
        {property.currency ? `${property.currency} ` : "$"}
        {property.price.toLocaleString()}
      </p>
      {property.description ? <p>{property.description}</p> : null}
      {details.length > 0 ? (
        <ul>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
      {extra ? (
        <ul>
          {Object.entries(extra).map(([key, value]) => (
            <li key={key}>
              {key}: {String(value)}
            </li>
          ))}
        </ul>
      ) : null}
      {property.source ? <p>Source: {property.source}</p> : null}
      {property.contactType === "direct" ? (
        <section>
          <h2>Contact the seller</h2>
          <p>{property.contactName}</p>
          <p>{property.contactPhone}</p>
          <p>{property.contactEmail}</p>
        </section>
      ) : agentIsAvailable && assignedAgent ? (
        <section>
          <h2>Estate agent</h2>
          <p>{assignedAgent.name}</p>
          <p>{assignedAgent.agency}</p>
          {assignedAgent.city ? <p>{assignedAgent.city}</p> : null}
          <p>{assignedAgent.country}</p>
          {assignedAgent.license ? <p>{assignedAgent.license}</p> : null}
          <p>{assignedAgent.phone}</p>
          <p>{assignedAgent.email}</p>
        </section>
      ) : null}
      {agentIsAvailable ? null : (
        <section className="flex flex-col gap-4">
          <p>
            {assignedAgent
              ? "This agent is not available. Choose another agent below."
              : "This property does not have an agent yet."}
          </p>
          <h2>Available Agents in This Region</h2>
          {regionalAgents.length === 0 ? (
            <p>No agents in this region.</p>
          ) : (
            <ul className="flex flex-col gap-6">
              {regionalAgents.map((agent) => (
                <li key={agent.id}>
                  <AgentProfileCard
                    name={agent.name}
                    agency={agent.agency}
                    city={agent.city}
                    phone={agent.phone}
                    email={agent.email}
                    photo={agentPhoto(agent.name)}
                    chooseHref={`/property/${property.id}/choose?agentId=${agent.id}`}
                    profileHref={`/agents/${agent.id}`}
                  />
                </li>
              ))}
            </ul>
          )}
          <p className="flex gap-4">
            {region ? (
              <Link href={regionPath(region)}>View all agents</Link>
            ) : null}
            <Link href={`/property/${property.id}/represent`}>
              Request representation
            </Link>
          </p>
        </section>
      )}
      {solicitor ? (
        <section>
          <h2>Solicitor</h2>
          <p>
            <Link href={`/solicitors/${solicitor.id}`}>
              {solicitor.name}
            </Link>
          </p>
          <p>{solicitor.firm}</p>
          {solicitor.city ? <p>{solicitor.city}</p> : null}
          <p>{solicitor.country}</p>
          {solicitor.license ? <p>{solicitor.license}</p> : null}
          <p>{solicitor.phone}</p>
          <p>{solicitor.email}</p>
          <p>
            <a href={`mailto:${solicitor.email}`}>Contact</a>
          </p>
        </section>
      ) : null}
      <section className="flex flex-col gap-4">
        <h2>Need legal assistance?</h2>
        {solicitors.length === 0 ? (
          <p>No solicitors available.</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {solicitors.map((option) => (
              <li key={option.id}>
                <p>
                  <Link href={`/solicitors/${option.id}`}>{option.name}</Link>
                </p>
                <p>{option.firm}</p>
                <p>{[option.city, option.country].filter(Boolean).join(", ")}</p>
                <p>{option.phone}</p>
                <p>{option.email}</p>
                <p className="flex gap-4">
                  <Link
                    href={`/property/${property.id}/hire?solicitorId=${option.id}`}
                  >
                    Hire solicitor
                  </Link>
                  <Link
                    href={`/property/${property.id}/consult?solicitorId=${option.id}`}
                  >
                    Request consultation
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function agentPhoto(name: string) {
  return `https://placehold.co/320x320/0f172a/f8fafc/png?text=${encodeURIComponent(name)}`;
}

function listingImages(images: string | null, image: string | null) {
  if (images) {
    try {
      const parsed = JSON.parse(images) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === "string" && item.length > 0)
      ) {
        return parsed;
      }
    } catch {
      return image ? [image] : [];
    }
  }
  return image ? [image] : [];
}

function listingDetails(property: {
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtUp: number | null;
  landSize: number | null;
  tenure: string | null;
  metadata: string | null;
}) {
  const areaUnit = readMetadata(property.metadata)?.areaUnit;
  const unit = typeof areaUnit === "string" ? ` ${areaUnit}` : "";
  const details = [
    property.propertyType,
    property.bedrooms == null ? null : `${property.bedrooms} bedrooms`,
    property.bathrooms == null ? null : `${property.bathrooms} bathrooms`,
    property.builtUp == null
      ? null
      : `${property.builtUp.toLocaleString()}${unit} built-up`,
    property.landSize == null
      ? null
      : `${property.landSize.toLocaleString()}${unit} land`,
    property.tenure,
  ];
  return details.filter((detail): detail is string => Boolean(detail));
}

function readMetadata(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
