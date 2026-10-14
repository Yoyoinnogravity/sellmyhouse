import Link from "next/link";
import { Suspense } from "react";
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
  const plural = typeChoice?.plural ?? site.plural;
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
            : `${capitalize(plural)} offered by individual owners. Listing your ${site.noun} for sale is free.`}
        </p>
        <p className="flex gap-4 text-sm">
          <Link href={browseHref("private", 1, search)} aria-current={sale === "private" ? "page" : undefined} className={sale === "private" ? "font-semibold" : undefined}>
            Private sales
          </Link>
          <Link href={browseHref("developer", 1, search)} aria-current={sale === "developer" ? "page" : undefined} className={sale === "developer" ? "font-semibold" : undefined}>
            Developer units
          </Link>
          {sale === "private" ? <Link href="/sell">List a property</Link> : null}
        </p>
        <ListingSearchForm sale={sale} search={search} places={places} />
      </div>
      <WorldMapSection sale={sale} search={search} />
      {result.total === 0 ? (
        <p>
          {searching
            ? "No listings match this search."
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
      <label className="sm:col-span-2">
        Place
        <select name="place" defaultValue={search.place} className="mt-1 block w-full border px-3 py-2">
          <option value="">Anywhere</option>
          {placeOptions.map((place) => (
            <option key={place} value={place}>
              {place}
            </option>
          ))}
        </select>
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
          <Link href={browseHref(sale)} className="self-center text-sm">
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
