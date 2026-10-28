import { connection } from "next/server"
import type { Prisma } from "@/generated/prisma/client"
import { publishedContact } from "@/lib/developerContact"
import { listingKind, type SaleKind } from "@/lib/listingKind"
import { hasRealPhotos, listingPhoto, priceLabel } from "@/lib/listingImage"
import { picturePoint, pointForListing, type MapProperty } from "@/lib/places"
import { geoIndex, pinMetadata } from "@/lib/listingGeo"
import { isRental, notRentWhere, perMonth, rentWhere } from "@/lib/rental"
import { prisma } from "@/lib/prisma"
import { cached } from "@/lib/queryCache"
import { searchStockWhere, type ListingSearch } from "@/lib/listingSearch"
import { currentSite, siteListingWhere } from "@/lib/site"

export type ListingPoint = MapProperty & {
  image: string
  hasPhoto: boolean
  phones: string[]
  whatsappNumber: string | null
  website: string | null
  kind: SaleKind
  developerVerified: boolean
}

const PAGE_SIZE = 12

function toPoint(row: {
  id: number
  title: string
  price: number
  currency: string | null
  location: string
  metadata?: string | null
}): MapProperty {
  const point = pointForListing(row.location, row.metadata ?? null)
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    priceLabel: perMonth(priceLabel(row.currency, row.price), isRental(row.metadata)),
    lat: point.lat,
    lng: point.lng,
  }
}

function cheapestOffer<T extends { id: number; price: number }>(offers: T[]) {
  return offers.reduce((best, offer) => {
    if (offer.price !== best.price) return offer.price < best.price ? offer : best
    return offer.id < best.id ? offer : best
  })
}

const developerListing = { metadata: { contains: '"register":"TEDUH"' } }

function saleWhere(sale: SaleKind): Prisma.PropertyWhereInput {
  if (sale === "developer") return developerListing
  return {
    OR: [{ metadata: null }, { NOT: developerListing }],
  }
}

async function listingWhere(sale?: SaleKind, search?: ListingSearch) {
  const site = await currentSite()
  const filters: Prisma.PropertyWhereInput[] = []
  const stock = searchStockWhere(search, siteListingWhere(site))
  if (stock && (search?.type || sale !== "developer")) filters.push(stock)
  if (sale) filters.push(saleWhere(sale))
  if (search?.place) filters.push({ location: { contains: search.place, mode: "insensitive" } })
  if (search?.deal === "rent") filters.push(rentWhere)
  if (search?.deal === "sale") filters.push(notRentWhere)
  if (search && (search.minPrice != null || search.maxPrice != null)) {
    filters.push({
      price: {
        ...(search.minPrice != null ? { gte: search.minPrice } : {}),
        ...(search.maxPrice != null ? { lte: search.maxPrice } : {}),
      },
    })
  }
  return filters.length === 1 ? filters[0] : { AND: filters }
}

export async function listPlaceOptions(sale: SaleKind, search: ListingSearch): Promise<string[]> {
  await connection()
  const site = await currentSite()
  const filters: Prisma.PropertyWhereInput[] = []
  const stock = searchStockWhere(search, siteListingWhere(site))
  if (stock && (search.type || sale !== "developer")) filters.push(stock)
  filters.push(saleWhere(sale))
  const query1 = {
    where: filters.length === 1 ? filters[0] : { AND: filters },
    select: { location: true },
  } satisfies Prisma.PropertyFindManyArgs
  const rows = await cached(`property:${JSON.stringify(query1)}`, () => prisma.property.findMany(query1))
  return placeSegments(rows.map((row) => row.location))
}

// Countries with stock, biggest first. The country is the last part of
// "Town, Region, Country"; listings with a single-part location are skipped.
export async function listCountryCounts(sale: SaleKind, search: ListingSearch): Promise<{ label: string; count: number }[]> {
  await connection()
  const site = await currentSite()
  const filters: Prisma.PropertyWhereInput[] = []
  const stock = searchStockWhere(search, siteListingWhere(site))
  if (stock && (search.type || sale !== "developer")) filters.push(stock)
  filters.push(saleWhere(sale))
  const query2 = {
    where: filters.length === 1 ? filters[0] : { AND: filters },
    select: { location: true },
  } satisfies Prisma.PropertyFindManyArgs
  const rows = await cached(`property:${JSON.stringify(query2)}`, () => prisma.property.findMany(query2))
  const counts = new Map<string, { label: string; count: number }>()
  for (const row of rows) {
    const parts = row.location.split(",").map((part) => part.trim()).filter(Boolean)
    if (parts.length < 2) continue
    const label = parts[parts.length - 1]
    const key = label.toLocaleLowerCase()
    const seen = counts.get(key)
    if (seen) seen.count += 1
    else counts.set(key, { label, count: 1 })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function placeSegments(locations: string[]) {
  const counts = new Map<string, { label: string; count: number }>()
  for (const location of locations) {
    for (const part of location.split(",")) {
      const label = part.trim()
      if (label.length < 2) continue
      const key = label.toLocaleLowerCase()
      const seen = counts.get(key)
      if (seen) seen.count += 1
      else counts.set(key, { label, count: 1 })
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 200)
    .map((entry) => entry.label)
}

export async function listMapPoints(sale?: SaleKind, search?: ListingSearch): Promise<MapProperty[]> {
  await connection()
  const where = await listingWhere(sale, search)
  const query3 = {
    where,
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      location: true,
    },
  } satisfies Prisma.PropertyFindManyArgs
  const [slim, geo] = await Promise.all([
    cached(`property:${JSON.stringify(query3)}`, () => prisma.property.findMany(query3), 15 * 60 * 1000),
    geoIndex(),
  ])
  const rows = slim.map((row) => ({ ...row, metadata: pinMetadata(geo.get(row.id)) }))
  const groups = new Map<string, typeof rows>()
  for (const row of rows) {
    const code = geo.get(row.id)?.code
    const key = code ? `teduh:${code}` : `listing:${row.id}`
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }
  return [...groups.values()].map((group) => {
    const lowest = cheapestOffer(group)
    return { ...toPoint(lowest), offerCount: group.length }
  })
}

export async function listListingsPage(page: number, sale: SaleKind, search?: ListingSearch): Promise<{
  items: ListingPoint[]
  page: number
  pages: number
  total: number
}> {
  await connection()
  const where = await listingWhere(sale, search)
  const total = await prisma.property.count({ where })
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(Math.max(1, page), pages)
  const rows = await prisma.property.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      location: true,
      image: true,
      images: true,
      metadata: true,
      developerVerified: true,
    },
  })

  return {
    page: current,
    pages,
    total,
    items: rows.map((row) => {
      const contact = publishedContact(row.metadata)
      return {
        ...toPoint(row),
        image: listingPhoto(row.title, row.images, row.image, picturePoint(row.location, row.metadata), row.id),
        hasPhoto: hasRealPhotos(row.images, row.image),
        phones: contact.phones,
        whatsappNumber: contact.whatsappNumber,
        website: contact.website,
        kind: listingKind(row.metadata),
        developerVerified: row.developerVerified,
      }
    }),
  }
}
