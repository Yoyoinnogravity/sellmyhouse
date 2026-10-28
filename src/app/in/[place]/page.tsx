import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdPlace } from "@/components/ad-place";
import PropertyCard from "@/components/PropertyCard";
import { WorldMapSection } from "@/components/world-map-section";
import { areaName, areaSlug } from "@/lib/areas";
import { emptyListingSearch } from "@/lib/listingSearch";
import { listListingsPage, listTopPlaces } from "@/lib/mappedProperties";
import { currentSite } from "@/lib/site";

// Area pages such as /in/mont-kiara: "Property for sale and rent in Mont
// Kiara". A plain address and a clear title is what people search for.

type Params = { params: Promise<{ place: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { place } = await params;
  const name = areaName(place);
  const site = await currentSite();
  const title = `Property for sale and rent in ${name}`;
  const description = `Houses, condos, land and new developments for sale or long-term rent in ${name}. Contact owners and realtors directly. Free, no account needed.`;
  return {
    metadataBase: new URL(`https://${site.host}`),
    title: `${title} | ${site.name}`,
    description,
    alternates: { canonical: `/in/${areaSlug(name)}` },
    openGraph: { title, description, url: `/in/${areaSlug(name)}`, siteName: site.name, type: "website" },
  };
}

export default function AreaPage({ params }: Params) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Suspense fallback={<p>Loading…</p>}>
        <Area params={params} />
      </Suspense>
    </main>
  );
}

async function Area({ params }: Params) {
  const { place } = await params;
  const name = areaName(place);
  const search = { ...emptyListingSearch("all"), place: name };
  const [owners, developments, places] = await Promise.all([
    listListingsPage(1, "private", search),
    listListingsPage(1, "developer", search),
    listTopPlaces(300).catch(() => []),
  ]);
  const nearby = places
    .filter((entry) => entry.label.toLowerCase() !== name.toLowerCase() && entry.count >= 2)
    .slice(0, 24);
  const q = encodeURIComponent(name);

  return (
    <>
      <AdPlace place={name} />
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Property for sale and rent in {name}</h1>
        <p className="text-zinc-700">
          {owners.total + developments.total > 0
            ? `${owners.total + developments.total} listings in ${name}: homes from owners and realtors, and new developments. Contact sellers and landlords directly.`
            : `No listings in ${name} yet. Be the first: listing is free.`}
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/properties?deal=sale&place=${q}`} className="inline-flex min-h-[40px] items-center border-2 border-zinc-900 px-3 font-semibold">For sale</Link>
          <Link href={`/properties?deal=rent&place=${q}`} className="inline-flex min-h-[40px] items-center border-2 border-zinc-900 px-3 font-semibold">For rent</Link>
          <Link href={`/sell`} className="inline-flex min-h-[40px] items-center bg-zinc-900 px-3 font-semibold text-white">List your property in {name}</Link>
          <Link href="/properties" className="inline-flex min-h-[40px] items-center border px-3">← Whole world</Link>
        </div>
      </div>

      <WorldMapSection search={search} />

      {owners.items.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">From owners and realtors in {name}</h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {owners.items.map((property) => (
              <li key={property.id}>
                <PropertyCard property={property} />
              </li>
            ))}
          </ul>
          {owners.total > owners.items.length ? (
            <Link href={`/properties?place=${q}`} className="underline">See all {owners.total} in {name}</Link>
          ) : null}
        </section>
      ) : null}

      {developments.items.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">New developments in {name}</h2>
          <ul className="grid gap-6 sm:grid-cols-2">
            {developments.items.map((property) => (
              <li key={property.id}>
                <PropertyCard property={property} />
              </li>
            ))}
          </ul>
          {developments.total > developments.items.length ? (
            <Link href={`/properties?sale=developer&place=${q}`} className="underline">See all {developments.total} developments in {name}</Link>
          ) : null}
        </section>
      ) : null}

      {nearby.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Other areas</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {nearby.map((entry) => (
              <li key={entry.label}>
                <Link href={`/in/${areaSlug(entry.label)}`} className="inline-flex min-h-[36px] items-center border px-3">
                  {entry.label} <span className="ml-1 text-zinc-500">{entry.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
