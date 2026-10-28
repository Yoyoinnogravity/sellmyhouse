import Link from "next/link";
import { Suspense } from "react";
import { InternetResults } from "@/components/internet-results";
import PropertyCard from "@/components/PropertyCard";
import { WorldMapSection } from "@/components/world-map-section";
import { saleKind, type SaleKind } from "@/lib/listingKind";
import {
  emptyListingSearch,
  listingTypeChoice,
  listingTypeOptions,
  parseListingSearch,
  PRICE_BANDS,
  RENT_BANDS,
  priceBandLabel,
  searchIsActive,
  type ListingSearch,
} from "@/lib/listingSearch";
import { listListingsPage, listPlaceOptions } from "@/lib/mappedProperties";
import { currentSite } from "@/lib/site";
import { AdPlace } from "@/components/ad-place";

type PropertySearchParams = {
  page?: string | string[];
  sale?: string | string[];
  place?: string | string[];
  min?: string | string[];
  max?: string | string[];
  type?: string | string[];
  all?: string | string[];
  deal?: string | string[];
};

export default function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<PropertySearchParams>;
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
  searchParams: Promise<PropertySearchParams>;
}) {
  const params = await searchParams;
  const sale = saleKind(firstValue(params.sale));
  const search = parseListingSearch(params);
  const requested = Number(firstValue(params.page));
  const [result, site, places] = await Promise.all([
    listListingsPage(Number.isInteger(requested) ? requested : 1, sale, search),
    currentSite(),
    listPlaceOptions(sale, search),
  ]);
  const typeChoice = search.type ? listingTypeChoice(search.type) : null;
  const allSites = search.scope === "all" && !typeChoice;
  const plural = typeChoice?.plural ?? (allSites ? "properties" : site.plural);
  const searching = searchIsActive(search);
  const developerHeading =
    sale === "developer" && !typeChoice
      ? "Developer units, condos, bungalows and land"
      : `Developer ${plural}`;

  return (
    <>
      {search.place ? (
        <div className="flex flex-wrap items-center gap-3 border-2 border-zinc-900 bg-zinc-50 p-3">
          <span>
            Showing <strong>{search.place}</strong>
          </span>
          <Link
            href={browseHref(sale, 1, { ...search, place: "" })}
            className="inline-flex min-h-[44px] items-center gap-2 bg-zinc-900 px-4 font-semibold text-white hover:bg-zinc-700"
          >
            ← Back to the whole world
          </Link>
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {sale === "developer"
            ? developerHeading
            : search.deal === "rent"
              ? `${capitalize(plural)} for rent`
              : search.deal === "sale"
                ? `${capitalize(plural)} for sale`
                : capitalize(plural)}
        </h1>
        <p className="text-sm text-zinc-600">
          {sale === "developer"
            ? typeChoice
              ? `${capitalize(plural)} from licensed developments. Each price is the lowest published for that unit type.`
              : "Units, condos, bungalows, and land from licensed developments. Each price is the lowest published for that unit type."
            : search.deal === "rent"
              ? `Long-term rentals (6 months or more) from owners and realtors. Listing your ${site.noun} for rent is free.`
              : `${capitalize(plural)} for sale and long-term rent, from owners and realtors${allSites ? ", anywhere in the world" : ""}. Listing yours is free.`}
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <ChoiceRow
            label="Looking to"
            options={[
              { href: browseHref(sale, 1, { ...search, deal: "sale", minPrice: null, maxPrice: null }), text: "Buy", on: search.deal === "sale" },
              { href: browseHref(sale, 1, { ...search, deal: "rent", minPrice: null, maxPrice: null }), text: "Rent", on: search.deal === "rent" },
              { href: browseHref(sale, 1, { ...search, deal: "any", minPrice: null, maxPrice: null }), text: "Both", on: search.deal === "any" },
            ]}
          />
          <ChoiceRow
            label="Show"
            options={[
              { href: browseHref(sale, 1, { ...search, scope: "site" }), text: `${capitalize(site.plural)} only`, on: search.scope === "site" },
              { href: browseHref(sale, 1, { ...search, scope: "all" }), text: "All property types", on: search.scope === "all" },
            ]}
          />
          <ChoiceRow
            label="From"
            options={[
              { href: browseHref("private", 1, search), text: "Owners", on: sale === "private" },
              { href: browseHref("developer", 1, search), text: "Developers", on: sale === "developer" },
            ]}
          />
        </div>
        <ListingSearchForm sale={sale} search={search} places={places} />
      </div>
      <AdPlace place={search.place} />
      <WorldMapSection sale={sale} search={search} />
      {result.total === 0 ? (
        <p>
          {searching
            ? search.place
              ? `Nothing in our own stock for “${search.place}” yet. Results from across the internet are below.`
              : "No listings match this search."
            : sale === "developer" && !typeChoice
              ? "No developer listings in this group yet."
              : `No ${plural} in this group yet.`}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-zinc-600">
            {result.total} {result.total === 1 ? "listing" : "listings"}
          </p>
          <ul className="grid gap-6 sm:grid-cols-2">
            {result.items.map((property) => (
              <li key={property.id}>
                <PropertyCard property={property} />
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {result.page > 1 ? <Link href={browseHref(sale, result.page - 1, search)}>Previous</Link> : null}
            <span>
              Page {result.page} of {result.pages}
            </span>
            {result.page < result.pages ? <Link href={browseHref(sale, result.page + 1, search)}>Next</Link> : null}
          </p>
        </div>
      )}
      <Suspense fallback={search.place ? <p className="text-sm text-zinc-600">Searching the internet…</p> : null}>
        <InternetResults search={search} />
      </Suspense>
    </>
  );
}

function ListingSearchForm({
  sale,
  search,
  places,
}: {
  sale: SaleKind;
  search: ListingSearch;
  places: string[];
}) {
  const placeOptions = search.place && !places.includes(search.place) ? [search.place, ...places] : places;
  return (
    <form action="/properties" className="grid items-end gap-3 border p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-6">
      {sale === "developer" ? <input type="hidden" name="sale" value="developer" /> : null}
      {search.scope === "site" ? <input type="hidden" name="all" value="0" /> : null}
      {search.deal !== "any" ? <input type="hidden" name="deal" value={search.deal} /> : null}
      <label className="sm:col-span-2">
        Town or country
        <input
          type="search"
          name="place"
          list="browse-places"
          defaultValue={search.place}
          placeholder="Anywhere"
          autoComplete="off"
          maxLength={80}
          className="mt-1 block w-full border px-3 py-2"
        />
        <datalist id="browse-places">
          {placeOptions.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>
      </label>
      <label>
        {search.deal === "rent" ? "Minimum rent" : "Minimum price"}
        <select name="min" defaultValue={search.minPrice ?? ""} className="mt-1 block w-full border px-3 py-2">
          <option value="">No minimum</option>
          {(search.deal === "rent" ? RENT_BANDS : PRICE_BANDS).map((price) => (
            <option key={price} value={price}>
              {priceBandLabel(price)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {search.deal === "rent" ? "Maximum rent" : "Maximum price"}
        <select name="max" defaultValue={search.maxPrice ?? ""} className="mt-1 block w-full border px-3 py-2">
          <option value="">No maximum</option>
          {(search.deal === "rent" ? RENT_BANDS : PRICE_BANDS).map((price) => (
            <option key={price} value={price}>
              {priceBandLabel(price)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Type
        <select name="type" defaultValue={search.type ?? ""} className="mt-1 block w-full border px-3 py-2">
          <option value="">Any type</option>
          {listingTypeOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="min-h-[44px] w-full border px-4 py-2 sm:w-auto">
          Search
        </button>
        {searchIsActive(search) ? (
          <Link href={browseHref(sale, 1, emptyListingSearch(search.scope))} className="self-center text-sm">
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function browseHref(sale: SaleKind, page = 1, search: ListingSearch = emptyListingSearch()) {
  const params = new URLSearchParams();
  if (sale === "developer") params.set("sale", "developer");
  if (search.scope === "site") params.set("all", "0");
  if (search.place) params.set("place", search.place);
  if (search.minPrice != null) params.set("min", String(search.minPrice));
  if (search.maxPrice != null) params.set("max", String(search.maxPrice));
  if (search.type) params.set("type", search.type);
  if (search.deal !== "any") params.set("deal", search.deal);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/properties?${query}` : "/properties";
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function capitalize(value: string) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

// A labelled pair of choices that look like buttons, with the current one filled in.
function ChoiceRow({
  label,
  options,
}: {
  label: string;
  options: { href: string; text: string; on: boolean }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 text-zinc-600">{label}</span>
      {options.map((option) => (
        <Link
          key={option.text}
          href={option.href}
          aria-current={option.on ? "page" : undefined}
          className={
            option.on
              ? "inline-flex min-h-[36px] items-center border border-zinc-900 bg-zinc-900 px-3 font-semibold text-white"
              : "inline-flex min-h-[36px] items-center border px-3 hover:border-zinc-900"
          }
        >
          {option.text}
        </Link>
      ))}
    </div>
  );
}
