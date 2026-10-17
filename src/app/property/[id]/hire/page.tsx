import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { SolicitorContacts } from "@/components/solicitor-contacts";
import { mailtoWithCopy } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function HireSolicitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ solicitorId?: string | string[] }>;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const propertyId = Number(id);
  const solicitorId = Number(firstValue(query.solicitorId));
  if (!Number.isInteger(propertyId) || !Number.isInteger(solicitorId)) {
    notFound();
  }

  const [property, solicitor] = await Promise.all([
    prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, title: true, location: true },
    }),
    prisma.solicitor.findUnique({
      where: { id: solicitorId },
      select: {
        id: true,
        name: true,
        firm: true,
        phone: true,
        email: true,
        country: true,
        city: true,
      },
    }),
  ]);

  if (!property || !solicitor) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Hire solicitor</h1>
      <p>
        You are hiring {solicitor.name} for {property.title}.
      </p>
      {solicitor.firm !== solicitor.name ? <p>{solicitor.firm}</p> : null}
      {solicitor.city ? <p>{solicitor.city}</p> : null}
      <p>{solicitor.country}</p>
      <SolicitorContacts phone={solicitor.phone} email={solicitor.email} />
      <p>
        <Link href={`/solicitors/${solicitor.id}`}>View profile</Link>
      </p>
      <p>
        <a
          href={mailtoWithCopy(solicitor.email, {
            subject: `Hire request for ${property.title}`,
          })}
        >
          Contact {solicitor.name}
        </a>
      </p>
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
