import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { FormatDownloads } from "@/components/format-downloads";
import { WorldMapSection } from "@/components/world-map-section";
import { emptyListingSearch, listingTypeOptions } from "@/lib/listingSearch";
import { listCountryCounts, listPlaceOptions } from "@/lib/mappedProperties";
import { currentSite } from "@/lib/site";

// The site is a place to look for property anywhere in the world first.
// Everything else — selling, agents, conveyancers, advertising — sits
// underneath the search. The search covers all four brands' stock, so a
// listing can be found and sold from any of the domains; the brand only
// sets the headline wording.

const sellerExamples = [
  { src: "/illustrations/house.svg", label: "Houses", alt: "Illustration of a family house" },
  { src: "/illustrations/condo.svg", label: "Condos and flats", alt: "Illustration of condominium towers" },
  { src: "/illustrations/bungalow.svg", label: "Bungalows", alt: "Illustration of a bungalow with palm trees" },
  { src: "/illustrations/land.svg", label: "Land", alt: "Illustration of a plot of land with a for-sale sign" },
];

const sellerSteps = [
  { title: "Add photos and a price", text: "Snap a few pictures on your phone. No account, no fees." },
  { title: "Buyers contact you", text: "They call, WhatsApp or email you directly. A realtor is optional." },
  { title: "Share it", text: "Your listing goes on the world map. Send it round on WhatsApp and Facebook." },
];

const moreChoices = [
  { href: "/properties?all=1", label: "Private sales" },
  { href: "/properties?sale=developer&all=1", label: "Developer units" },
  { href: "/agents", label: "Find an agent" },
  { href: "/solicitors", label: "Find a conveyancer" },
  { href: "/agents/register", label: "I'm a realtor" },
  { href: "/advertise", label: "Advertise" },
];

export default async function HomePage() {
  const site = await currentSite();
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-10 sm:px-6 sm:pt-16">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Buy, rent or sell your {site.noun} anywhere in the world
          </h1>
          <p className="text-zinc-600">
            Houses, condos, land, bungalows and new developments from every Sell My site, on one
            map. Type a town or a country. No account needed.
          </p>
        </div>
        <Suspense fallback={<SearchForm places={[]} />}>
          <SearchWithPlaces />
        </Suspense>
        <Suspense fallback={null}>
          <CountryChips />
        </Suspense>
      </section>
      <SellersSection />
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 sm:px-6 sm:py-10">
        <h2 className="text-2xl font-semibold tracking-tight">Property around the world</h2>
        <Suspense fallback={<p>Loading the map…</p>}>
          <WorldMapSection search={emptyListingSearch("all")} />
        </Suspense>
      </section>
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 border-t px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-lg">
          Selling? Listing your {site.noun} is free.{" "}
          <Link href="/sell" className="font-semibold underline">
            Sell {site.withArticle}
          </Link>
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {moreChoices.map((choice) => (
            <li key={choice.href}>
              <Link href={choice.href}>{choice.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

async function SearchWithPlaces() {
  // If the database is unavailable, the search box still works without suggestions.
  let places: string[] = [];
  try {
    places = await listPlaceOptions("private", emptyListingSearch("all"));
  } catch (error) {
    unstable_rethrow(error);
  }
  return <SearchForm places={places} />;
}

async function CountryChips() {
  let countries: Awaited<ReturnType<typeof listCountryCounts>> = [];
  try {
    countries = await listCountryCounts("private", emptyListingSearch("all"));
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
  if (countries.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-600">Where the stock is</p>
      <ul className="flex flex-wrap gap-2">
        {countries.slice(0, 16).map((country) => (
          <li key={country.label}>
            <Link
              href={`/properties?all=1&place=${encodeURIComponent(country.label)}`}
              className="inline-flex min-h-[36px] items-center gap-2 border px-3 py-1 text-sm"
            >
              {country.label}
              <span className="text-zinc-500">{country.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchForm({ places }: { places: string[] }) {
  return (
    <form action="/properties" className="grid items-end gap-3 border p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-6">
      <input type="hidden" name="all" value="1" />
      <label className="sm:col-span-2">
        Town or country
        <input
          type="search"
          name="place"
          list="home-places"
          placeholder="Johor Bahru, Tokyo, Australia…"
          autoComplete="off"
          maxLength={80}
          className="mt-1 block w-full border px-3 py-2"
        />
        <datalist id="home-places">
          {places.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>
      </label>
      <label>
        Looking to
        <select name="deal" defaultValue="" className="mt-1 block w-full border px-3 py-2">
          <option value="">Buy or rent</option>
          <option value="sale">Buy</option>
          <option value="rent">Rent</option>
        </select>
      </label>
      <label>
        Max price or rent
        <input
          name="max"
          inputMode="numeric"
          placeholder="No limit"
          className="mt-1 block w-full border px-3 py-2"
        />
      </label>
      <label>
        Type
        <select name="type" defaultValue="" className="mt-1 block w-full border px-3 py-2">
          <option value="">Any type</option>
          {listingTypeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="min-h-[44px] w-full border px-4 py-2 text-lg font-semibold">
        Search
      </button>
    </form>
  );
}

// Shown whether or not the database is available: it needs no data.
function SellersSection() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 border-t px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">Selling? List it free in three steps</h2>
        <p className="text-zinc-600">Any kind of property, anywhere in the world.</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {sellerExamples.map((example) => (
          <li key={example.src}>
            <Link href="/sell" className="group flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={example.src}
                alt={example.alt}
                width={400}
                height={260}
                loading="lazy"
                className="aspect-[400/260] w-full border object-cover transition group-hover:opacity-90"
              />
              <span className="text-sm font-semibold">{example.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <ol className="grid gap-4 sm:grid-cols-3">
        {sellerSteps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-zinc-900 font-semibold text-white">
              {index + 1}
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{step.title}</span>
              <span className="text-sm text-zinc-600">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div>
        <Link
          href="/sell"
          className="inline-flex min-h-[48px] items-center bg-zinc-900 px-6 text-base font-semibold text-white hover:bg-zinc-700"
        >
          List your property free
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormatDownloads audience="sellers" />
        <FormatDownloads />
      </div>
    </section>
  );
}
