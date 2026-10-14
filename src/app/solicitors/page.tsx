import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { SolicitorContacts } from "@/components/solicitor-contacts";
import { listSolicitors } from "@/lib/solicitor";

const places = [
  "Kuala Lumpur",
  "Selangor",
  "Penang",
  "Johor",
  "Perak",
  "Melaka",
];

export default function SolicitorsPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string | string[] }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Conveyancers</h1>
      <p>
        Choose a conveyancing solicitor for a purchase or a sale. Each firm
        shows the phone number and email published for contact.
      </p>
      <p className="flex flex-wrap gap-4">
        <Link href="/solicitors">All areas</Link>
        {places.map((place) => (
          <Link key={place} href={`/solicitors?place=${encodeURIComponent(place)}`}>
            {place}
          </Link>
        ))}
      </p>
      <p className="flex gap-4">
        <Link href="/solicitors/register">Register</Link>
        <Link href="/solicitors/login">Log in</Link>
      </p>
      <Suspense fallback={<p>Loading…</p>}>
        <SolicitorDirectory searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SolicitorDirectory({
  searchParams,
}: {
  searchParams: Promise<{ place?: string | string[] }>;
}) {
  await connection();
  const params = await searchParams;
  const place = firstValue(params.place).trim();
  const solicitors = await listSolicitors(place);

  if (solicitors.length === 0) {
    return <p>No conveyancers listed for this area yet.</p>;
  }

  const groups = new Map<string, typeof solicitors>();
  for (const solicitor of solicitors) {
    const label = [solicitor.city, solicitor.country].filter(Boolean).join(", ");
    const group = groups.get(label) ?? [];
    group.push(solicitor);
    groups.set(label, group);
  }

  return (
    <>
      <p>
        {place
          ? `${solicitors.length} conveyancers in ${place}.`
          : `${solicitors.length} conveyancers.`}
      </p>
      {[...groups.entries()].map(([label, group]) => (
        <section key={label} className="flex flex-col gap-4">
          <h2>{label}</h2>
          <ul className="flex flex-col gap-6">
            {group.map((solicitor) => (
              <li key={solicitor.id}>
                <Link href={`/solicitors/${solicitor.id}`}>{solicitor.name}</Link>
                {solicitor.firm !== solicitor.name ? <p>{solicitor.firm}</p> : null}
                {solicitor.license ? <p>{solicitor.license}</p> : null}
                <SolicitorContacts phone={solicitor.phone} email={solicitor.email} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-zinc-600">
        Malaysian firms are conveyancers listed for Conveyancing and Property in
        the Malaysian Bar Legal Directory.
      </p>
    </>
  );
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
