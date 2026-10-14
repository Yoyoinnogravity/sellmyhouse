import Link from "next/link";
import { Suspense } from "react";
import { WorldMapSection } from "@/components/world-map-section";
import { currentSite } from "@/lib/site";

const choices = [
  { href: "/buy", label: "I'm just browsing" },
  { href: "/sell", label: "I want to test the market" },
  { href: "/solicitors", label: "I need a conveyancer" },
  { href: "/agents", label: "I want an agent" },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <Suspense fallback={<h1 className="text-3xl font-semibold tracking-tight">Sell My House</h1>}>
          <SiteTitle />
        </Suspense>
        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <Link
            href="/buy"
            className="flex min-h-28 flex-1 items-center justify-center border text-2xl font-semibold"
          >
            BUY
          </Link>
          <Link
            href="/sell"
            className="flex min-h-28 flex-1 items-center justify-center border text-2xl font-semibold"
          >
            SELL
          </Link>
        </div>
        <Suspense fallback={<p>Listing your property for sale is free.</p>}>
          <FreeListing />
        </Suspense>
        <ul className="flex flex-col gap-3">
          {choices.map((choice) => (
            <li key={choice.href + choice.label}>
              <Link href={choice.href}>{choice.label}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 pb-16">
        <Suspense fallback={<h2 className="text-2xl font-semibold tracking-tight">Homes on the map</h2>}>
          <MapHeading />
        </Suspense>
        <Suspense fallback={<p>Loading the map…</p>}>
          <WorldMapSection />
        </Suspense>
        <p className="flex gap-4">
          <Link href="/properties">Private sales</Link>
          <Link href="/properties?sale=developer">Developer units</Link>
        </p>
      </section>
    </main>
  );
}

async function SiteTitle() {
  const site = await currentSite();
  return <h1 className="text-3xl font-semibold tracking-tight">{site.name}</h1>;
}

async function FreeListing() {
  const site = await currentSite();
  return <p>Listing your {site.noun} for sale is free.</p>;
}

async function MapHeading() {
  const site = await currentSite();
  return <h2 className="text-2xl font-semibold tracking-tight">{site.mapHeading}</h2>;
}
