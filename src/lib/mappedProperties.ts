import { connection } from "next/server"
import type { Prisma } from "@/generated/prisma/client"
import { publishedContact } from "@/lib/developerContact"
import { listingKind, type SaleKind } from "@/lib/listingKind"
import { listingPhoto, priceLabel } from "@/lib/listingImage"
import { pointForListing, type MapProperty } from "@/lib/places"
import { prisma } from "@/lib/prisma"
import { currentSite, siteListingWhere } from "@/lib/site"

export type ListingPoint = MapProperty & {
  image: string
  phones: string[]
  whatsappNumber: string | null
  website: string | null
  kind: SaleKind
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
    priceLabel: priceLabel(row.currency, row.price),
    lat: point.lat,
    lng: point.lng,
  }
}

function offerKey(id: number, metadata: string | null) {
  if (!metadata) return `listing:${id}`
  try {
    const parsed = JSON.parse(metadata) as { register?: unknown; projectCode?: unknown }
    if (parsed.register === "TEDUH" && typeof parsed.projectCode === "string" && parsed.projectCode) {
      return `teduh:${parsed.projectCode}`
    }
  } catch {
    // Ungrouped listings keep their own pin.
  }
  return `listing:${id}`
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

async function listingWhere(sale?: SaleKind) {
  const site = await currentSite()
  const typed = siteListingWhere(site)
  if (!sale) return typed
  return { AND: [typed, saleWhere(sale)] }
}

export async function listMapPoints(sale?: SaleKind): Promise<MapProperty[]> {
  await connection()
  const where = await listingWhere(sale)
  const rows = await prisma.property.findMany({
    where,
    orderBy: { id: "asc" },
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      location: true,
      metadata: true,
    },
  })
  const groups = new Map<string, typeof rows>()
  for (const row of rows) {
    const key = offerKey(row.id, row.metadata)
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }
  return [...groups.values()].map((group) => {
    const lowest = cheapestOffer(group)
    return { ...toPoint(lowest), offerCount: group.length }
  })
}

export async function listListingsPage(page: number, sale: SaleKind): Promise<{
  items: ListingPoint[]
  page: number
  pages: number
  total: number
}> {
  await connection()
  const where = await listingWhere(sale)
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
        image: listingPhoto(row.title, row.images, row.image),
        phones: contact.phones,
        whatsappNumber: contact.whatsappNumber,
        website: contact.website,
        kind: listingKind(row.metadata),
      }
    }),
  }
}
