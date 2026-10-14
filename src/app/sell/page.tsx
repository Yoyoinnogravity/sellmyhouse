import Link from "next/link";
import { Suspense } from "react";
import { currentSite } from "@/lib/site";
import SellForm from "./sell-form";

type SellSearchParams = {
  title?: string | string[];
  price?: string | string[];
  location?: string | string[];
};

export default function SellPage({
  searchParams,
}: {
  searchParams: Promise<SellSearchParams>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-16">
      <Suspense
        fallback={
          <>
            <h1 className="text-3xl font-semibold tracking-tight">Sell your house</h1>
            <p className="mt-2">Listing your property for sale is free.</p>
          </>
        }
      >
        <SellHeading />
      </Suspense>
      <p className="mt-4">
        Add photos and a description, then choose or specify a realtor or a solicitor.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        <li>List it yourself, on this page.</li>
        <li>
          <Link href="/solicitors">Choose a solicitor</Link>
        </li>
        <li>
          <Link href="/agents">Choose a realtor</Link>
        </li>
        <li>
          <Link href="/agents/register">I'm a realtor. Add your details and region.</Link>
        </li>
      </ul>
      <Suspense fallback={<p>Loading…</p>}>
        <AuthorizedSellForm searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AuthorizedSellForm({
  searchParams,
}: {
  searchParams: Promise<SellSearchParams>;
}) {
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

async function SellHeading() {
  const site = await currentSite();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Sell your {site.noun}</h1>
      <p className="mt-2">Listing your {site.noun} for sale is free.</p>
    </>
  );
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
