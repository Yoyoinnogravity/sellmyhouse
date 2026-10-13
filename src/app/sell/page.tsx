import { Suspense } from "react";
import { requireUser } from "@/lib/session";
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
      <h1 className="text-3xl font-semibold tracking-tight">Sell your house</h1>
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
  await requireUser();
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
