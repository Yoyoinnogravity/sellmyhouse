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
  priceBandLabel,
  searchIsActive,
  type ListingSearch,
} from "@/lib/listingSearch";
import { listListingsPage, listPlaceOptions } from "@/lib/mappedProperties";
import { currentSite } from "@/lib/site";

type PropertySearchParams = {
  page?: string | string[];
  sale?: string | string[];
  place?: string | string[];
  min?: string | string[];
  max?: string | string[];
  type?: string | string[];
  all?: string | string[];
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
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {sale === "developer" ? developerHeading : `Private ${plural}`}
        </h1>
        <p className="text-sm text-zinc-600">
          {sale === "developer"
            ? typeChoice
              ? `${capitalize(plural)} from licensed developments. Each price is the lowest published for that unit type.`
              : "Units, condos, bungalows, and land from licensed developments. Each price is the lowest published for that unit type."
            : `${capitalize(plural)} offered by individual owners${allSites ? " across sellmyhouse, sellmycondo, sellmyland and sellmybungalow" : ""}. Listing your ${site.noun} for sale is free.`}
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <ChoiceRow
            label="Show"
            options={[
              { href: browseHref(sale, 1, { ...search, scope: "site" }), text: `${capitalize(site.plural)} only`, on: search.scope === "site" },
              { href: browseHref(sale, 1, { ...search, scope: "all" }), text: "All property types", on: search.scope === "all" },
            ]}
          />
          <ChoiceRow
            label="Selling"
            options={[
              { href: browseHref("private", 1, search), text: "Owners", on: sale === "private" },
              { href: browseHref("developer", 1, search), text: "Developers", on: sale === "developer" },
            ]}
          />
        </div>
        <ListingSearchForm sale={sale} search={search} places={places} />
      </div>
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
      {search.scope === "all" ? <input type="hidden" name="all" value="1" /> : null}
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
        Minimum price
        <select name="min" defaultValue={search.minPrice ?? ""} className="mt-1 block w-full border px-3 py-2">
          <option value="">No minimum</option>
          {PRICE_BANDS.map((price) => (
            <option key={price} value={price}>
              {priceBandLabel(price)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Maximum price
        <select name="max" defaultValue={search.maxPrice ?? ""} className="mt-1 block w-full border px-3 py-2">
          <option value="">No maximum</option>
          {PRICE_BANDS.map((price) => (
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
  if (search.scope === "all") params.set("all", "1");
  if (search.place) params.set("place", search.place);
  if (search.minPrice != null) params.set("min", String(search.minPrice));
  if (search.maxPrice != null) params.set("max", String(search.maxPrice));
  if (search.type) params.set("type", search.type);
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
      <span className="w-16 text-zinc-600">{label}</span>
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
