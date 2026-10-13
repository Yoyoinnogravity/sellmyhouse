import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getSolicitorById } from "@/lib/solicitor";

export const instant = false;

export default async function SolicitorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const solicitorId = Number(id);
  if (!Number.isInteger(solicitorId)) {
    notFound();
  }

  const solicitor = await getSolicitorById(solicitorId);
  if (!solicitor) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{solicitor.name}</h1>
      <p>{solicitor.firm}</p>
      {solicitor.city ? <p>{solicitor.city}</p> : null}
      <p>{solicitor.country}</p>
      <p>{solicitor.phone}</p>
      <p>{solicitor.email}</p>
      {solicitor.license ? <p>{solicitor.license}</p> : null}
      <p>
        <a href={`mailto:${solicitor.email}`}>Contact</a>
      </p>
      <section className="flex flex-col gap-4">
        <h2>Listings</h2>
        {solicitor.properties.length === 0 ? (
          <p>No listings yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {solicitor.properties.map((property) => (
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
