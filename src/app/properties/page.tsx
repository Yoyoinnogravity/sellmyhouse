import Link from "next/link";
import { Suspense } from "react";
import PropertyCard from "@/components/PropertyCard";
import { WorldMapSection } from "@/components/world-map-section";
import { saleKind, type SaleKind } from "@/lib/listingKind";
import { listListingsPage } from "@/lib/mappedProperties";
import { currentSite } from "@/lib/site";

export default function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sale?: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-16">
      <Suspense fallback={<p>Loading listings…</p>}>
        <SaleBrowse searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SaleBrowse({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sale?: string }>;
}) {
  const params = await searchParams;
  const sale = saleKind(params.sale);
  const requested = Number(params.page);
  const [result, site] = await Promise.all([
    listListingsPage(Number.isInteger(requested) ? requested : 1, sale),
    currentSite(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {sale === "developer" ? `Developer ${site.plural}` : `Private ${site.plural}`}
        </h1>
        <p className="text-sm text-zinc-600">
          {sale === "developer"
            ? `${site.plural[0].toUpperCase()}${site.plural.slice(1)} from licensed developments. Each price is the lowest published for that unit type.`
            : `${site.plural[0].toUpperCase()}${site.plural.slice(1)} offered by individual owners. Listing your ${site.noun} for sale is free.`}
        </p>
        <p className="flex gap-4 text-sm">
          <Link href={saleHref("private")} aria-current={sale === "private" ? "page" : undefined} className={sale === "private" ? "font-semibold" : undefined}>
            Private sales
          </Link>
          <Link href={saleHref("developer")} aria-current={sale === "developer" ? "page" : undefined} className={sale === "developer" ? "font-semibold" : undefined}>
            Developer units
          </Link>
          {sale === "private" ? <Link href="/sell">List a property</Link> : null}
        </p>
      </div>
      <WorldMapSection sale={sale} />
      {result.total === 0 ? (
        <p>No {site.plural} in this group yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          <ul className="grid gap-6 sm:grid-cols-2">
            {result.items.map((property) => (
              <li key={property.id}>
                <PropertyCard property={property} />
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-4 text-sm">
            {result.page > 1 ? <Link href={saleHref(sale, result.page - 1)}>Previous</Link> : null}
            <span>
              Page {result.page} of {result.pages}
            </span>
            {result.page < result.pages ? <Link href={saleHref(sale, result.page + 1)}>Next</Link> : null}
          </p>
        </div>
      )}
    </>
  );
}

function saleHref(sale: SaleKind, page = 1) {
  const params = new URLSearchParams();
  if (sale === "developer") params.set("sale", "developer");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/properties?${query}` : "/properties";
}
