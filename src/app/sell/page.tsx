import Link from "next/link";
import { Suspense } from "react";
import { currentSite } from "@/lib/site";
import ListingWizard from "./wizard-loader";
import SellForm from "./sell-form";

type SellSearchParams = {
  title?: string | string[];
  price?: string | string[];
  location?: string | string[];
  as?: string | string[];
  deal?: string | string[];
};

export default function SellPage({
  searchParams,
}: {
  searchParams: Promise<SellSearchParams>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16">
      <Suspense
        fallback={
          <>
            <h1 className="text-3xl font-semibold tracking-tight">Sell or rent out your property, free</h1>
            <p className="mt-2 text-zinc-600">No account needed. It takes about two minutes.</p>
          </>
        }
      >
        <SellHeading />
      </Suspense>
      <Suspense fallback={<p className="mt-8">Loading…</p>}>
        <SellForms searchParams={searchParams} />
      </Suspense>
      <details className="mt-10 border-t pt-6">
        <summary className="cursor-pointer font-semibold">
          Want a realtor or conveyancer to handle it? More options
        </summary>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          <p>
            Choose a realtor or conveyancer while you list, or browse them first:{" "}
            <Link href="/agents" className="underline">find a realtor</Link> ·{" "}
            <Link href="/solicitors" className="underline">find a conveyancer</Link> ·{" "}
            <Link href="/agents/register" className="underline">I&apos;m a realtor</Link>
          </p>
        </div>
        <Suspense fallback={null}>
          <AdvancedForm searchParams={searchParams} />
        </Suspense>
      </details>
    </main>
  );
}

async function SellHeading() {
  const site = await currentSite();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Sell or rent out your {site.noun}, free</h1>
      <p className="mt-2 text-zinc-600">
        No account, no fees. We&apos;ll guide you one step at a time. It takes about two minutes.
      </p>
    </>
  );
}

async function SellForms({ searchParams }: { searchParams: Promise<SellSearchParams> }) {
  const [params, site] = await Promise.all([searchParams, currentSite()]);
  return (
    <ListingWizard
      noun={site.noun}
      asRealtor={firstValue(params.as) === "realtor"}
      forRent={firstValue(params.deal) === "rent"}
      defaults={{
        title: firstValue(params.title),
        price: firstValue(params.price),
        location: firstValue(params.location),
      }}
    />
  );
}

async function AdvancedForm({ searchParams }: { searchParams: Promise<SellSearchParams> }) {
  const params = await searchParams;
  return (
    <SellForm
      defaults={{
        title: firstValue(params.title),
        price: firstValue(params.price),
        location: firstValue(params.location),
      }}
    />
  );
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
