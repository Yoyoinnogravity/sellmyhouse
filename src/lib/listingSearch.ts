import type { Prisma } from "@/generated/prisma/client"

export type ListingTypeId =
  | "terrace"
  | "townhouse"
  | "semi"
  | "condo"
  | "apartment"
  | "bungalow"
  | "land"

export type ListingSearch = {
  place: string
  minPrice: number | null
  maxPrice: number | null
  type: ListingTypeId | null
  // "all": search every brand's stock (houses, condos, land, bungalows) from
  // whichever domain the visitor is on. "site": only this brand's type.
  scope: "site" | "all"
}

const PRICE_MAX = 2_000_000_000

const listingTypes: {
  id: ListingTypeId
  label: string
  plural: string
  withArticle: string
  where: Prisma.PropertyWhereInput
}[] = [
  {
    id: "terrace",
    label: "Terrace",
    plural: "terraces",
    withArticle: "a terrace",
    where: { propertyType: { in: ["Rumah Teres", "Terrace"] } },
  },
  {
    id: "townhouse",
    label: "Townhouse",
    plural: "townhouses",
    withArticle: "a townhouse",
    where: { propertyType: { in: ["Townhouse", "Rumah Bandar"] } },
  },
  {
    id: "semi",
    label: "Semi-detached",
    plural: "semi-detached homes",
    withArticle: "a semi-detached home",
    where: { propertyType: { in: ["Rumah Berkembar", "Semi-detached"] } },
  },
  {
    id: "condo",
    label: "Condo",
    plural: "condos",
    withArticle: "a condo",
    where: { propertyType: { in: ["Condominium", "Rumah Pangsa Kondo"] } },
  },
  {
    id: "apartment",
    label: "Apartment",
    plural: "apartments",
    withArticle: "an apartment",
    where: {
      propertyType: {
        in: ["Apartment", "Pangsapuri Servis", "Pangsapuri Suite", "Flat", "Walk-up", "Studio", "Soho", "Suite Homes"],
      },
    },
  },
  {
    id: "bungalow",
    label: "Bungalow",
    plural: "bungalows",
    withArticle: "a bungalow",
    where: {
      propertyType: {
        in: ["Bungalow", "Rumah Sesebuah", "Rumah Berpagar", "Rumah Berpagar Berpengawal", "Detached", "Villa"],
      },
    },
  },
  {
    id: "land",
    label: "Land",
    plural: "plots",
    withArticle: "land",
    where: {
      OR: [
        { propertyType: { contains: "Tanah" } },
        { propertyType: { contains: "Land" } },
        { title: { contains: "Tanah" } },
      ],
    },
  },
]

export const listingTypeOptions = listingTypes.map(({ id, label }) => ({ id, label }))

export const PRICE_BANDS = [
  50_000, 100_000, 150_000, 200_000, 300_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000,
  5_000_000,
]

export function priceBandLabel(value: number) {
  return value.toLocaleString("en-US")
}

export function listingTypeChoice(id: ListingTypeId) {
  return listingTypes.find((type) => type.id === id) ?? null
}

export function listingTypeWhere(id: ListingTypeId): Prisma.PropertyWhereInput {
  return listingTypeChoice(id)?.where ?? {}
}

export function emptyListingSearch(scope: ListingSearch["scope"] = "site"): ListingSearch {
  return { place: "", minPrice: null, maxPrice: null, type: null, scope }
}

export function parseListingSearch(params: {
  place?: string | string[]
  min?: string | string[]
  max?: string | string[]
  type?: string | string[]
  all?: string | string[]
}): ListingSearch {
  const scope = firstValue(params.all) === "1" ? "all" : "site"
  const place = firstValue(params.place).trim().slice(0, 80)
  let minPrice = priceValue(params.min)
  let maxPrice = priceValue(params.max)
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    const swap = minPrice
    minPrice = maxPrice
    maxPrice = swap
  }
  const typeValue = firstValue(params.type)
  const type = listingTypes.some((type) => type.id === typeValue) ? (typeValue as ListingTypeId) : null
  return { place, minPrice, maxPrice, type, scope }
}

export function searchIsActive(search: ListingSearch) {
  return search.place !== "" || search.minPrice != null || search.maxPrice != null || search.type != null
}

// Which stock a search covers: a chosen type wins, then "all sites", then this brand.
export function searchStockWhere(search: ListingSearch | undefined, siteWhere: Prisma.PropertyWhereInput): Prisma.PropertyWhereInput | null {
  if (search?.type) return listingTypeWhere(search.type)
  if (search?.scope === "all") return null
  return siteWhere
}

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

function priceValue(value: string | string[] | undefined) {
  const raw = firstValue(value).replace(/,/g, "").trim()
  if (!raw) return null
  const price = Number(raw)
  if (!Number.isInteger(price) || price < 1 || price > PRICE_MAX) return null
  return price
}
