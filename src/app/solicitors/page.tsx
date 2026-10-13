import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { listSolicitors } from "@/lib/solicitor";

export default function SolicitorsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Solicitors</h1>
      <p className="flex gap-4">
        <Link href="/solicitors/register">Register</Link>
        <Link href="/solicitors/login">Log in</Link>
      </p>
      <Suspense fallback={<p>Loading…</p>}>
        <SolicitorDirectory />
      </Suspense>
    </main>
  );
}

async function SolicitorDirectory() {
  await connection();
  const solicitors = await listSolicitors();

  if (solicitors.length === 0) {
    return <p>No solicitors yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-6">
      {solicitors.map((solicitor) => (
        <li key={solicitor.id}>
          <Link href={`/solicitors/${solicitor.id}`}>{solicitor.name}</Link>
          <p>{solicitor.firm}</p>
          <p>{[solicitor.city, solicitor.country].filter(Boolean).join(", ")}</p>
          <p>{solicitor.phone}</p>
          <p>{solicitor.email}</p>
          {solicitor.license ? <p>{solicitor.license}</p> : null}
        </li>
      ))}
    </ul>
  );
}
