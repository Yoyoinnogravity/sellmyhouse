import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { SolicitorContacts } from "@/components/solicitor-contacts";
import { mailtoWithCopy } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function RequestConsultationPage({
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
      select: { id: true, title: true, location: true, price: true },
    }),
    prisma.solicitor.findUnique({
      where: { id: solicitorId },
      select: {
        id: true,
        name: true,
        firm: true,
        phone: true,
        email: true,
      },
    }),
  ]);

  if (!property || !solicitor) {
    notFound();
  }

  const mailHref = mailtoWithCopy(solicitor.email, {
    subject: `Consultation request for ${property.title}`,
    body: `I would like a consultation about ${property.title} in ${property.location} (${property.id}).`,
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Request consultation
      </h1>
      <p>
        Consultation requested with {solicitor.name} about {property.title}.
      </p>
      {solicitor.firm !== solicitor.name ? <p>{solicitor.firm}</p> : null}
      <SolicitorContacts phone={solicitor.phone} email={solicitor.email} />
      <p>
        <a href={mailHref}>
          Send consultation request
        </a>
      </p>
      <p>
        <Link href={`/solicitors/${solicitor.id}`}>View profile</Link>
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
