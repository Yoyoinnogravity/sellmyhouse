import Link from "next/link";
import { Suspense } from "react";
import { WorldMapSection } from "@/components/world-map-section";
import { currentSite } from "@/lib/site";

const choices = [
  { href: "/buy", label: "I'm just browsing" },
  { href: "/sell", label: "I want to test the market" },
  { href: "/solicitors", label: "I need a conveyancer" },
  { href: "/agents", label: "I want an agent" },
  { href: "/agents/register", label: "I'm a realtor" },
  { href: "/advertise", label: "I want to advertise" },
];

export default async function HomePage() {
  const site = await currentSite();
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 px-4 py-10 text-center sm:gap-10 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{site.name}</h1>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/buy"
            className="flex min-h-[72px] flex-1 items-center justify-center border px-4 py-4 text-xl font-semibold sm:min-h-28 sm:text-2xl"
          >
            BUY
          </Link>
          <Link
            href="/sell"
            className="flex min-h-[72px] flex-1 items-center justify-center border px-4 py-4 text-xl font-semibold sm:min-h-28 sm:text-2xl"
          >
            SELL
          </Link>
        </div>
        <p>Listing your {site.noun} for sale is free.</p>
        <ul className="flex flex-col gap-3">
          {choices.map((choice) => (
            <li key={choice.href + choice.label}>
              <Link href={choice.href}>{choice.label}</Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-10 sm:px-6 sm:pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">{site.mapHeading}</h2>
        <Suspense fallback={<p>Loading the map…</p>}>
          <WorldMapSection />
        </Suspense>
        <p className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/properties">Private sales</Link>
          <Link href="/properties?sale=developer">Developer units</Link>
        </p>
      </section>
    </main>
  );
}
