import { Suspense } from "react";
import { redirect } from "next/navigation";
import { listAgents } from "@/lib/agent";
import { listSolicitors } from "@/lib/solicitor";
import { requireUser } from "@/lib/session";
import PublishForm from "./publish-form";

type PublishSearchParams = {
  title?: string | string[];
  price?: string | string[];
  location?: string | string[];
};

export default function SellPublishPage({
  searchParams,
}: {
  searchParams: Promise<PublishSearchParams>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Publish your listing</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <AuthorizedPublish searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AuthorizedPublish({
  searchParams,
}: {
  searchParams: Promise<PublishSearchParams>;
}) {
  await requireUser();
  const params = await searchParams;
  const title = firstValue(params.title).trim();
  const price = firstValue(params.price).trim();
  const location = firstValue(params.location).trim();
  const priceNumber = Number(price);

  if (!title || !location || !Number.isInteger(priceNumber) || priceNumber <= 0) {
    redirect("/sell");
  }

  const [solicitors, agents] = await Promise.all([
    listSolicitors(location),
    listAgents(location),
  ]);

  return (
    <PublishForm
      draft={{ title, price, location }}
      solicitors={solicitors.map((solicitor) => ({
        id: solicitor.id,
        name: solicitor.name,
        firm: solicitor.firm,
        phone: solicitor.phone,
        email: solicitor.email,
        country: solicitor.country,
        city: solicitor.city,
      }))}
      agents={agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        agency: agent.agency,
        country: agent.country,
        city: agent.city,
      }))}
    />
  );
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
