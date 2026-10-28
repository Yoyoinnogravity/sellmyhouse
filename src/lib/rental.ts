import type { Prisma } from "@/generated/prisma/client"

// Long-term rentals only: no holiday lets, homestays or short stays.
export const MIN_LEASE_MONTHS = 6
const SHORT_STAY =
  /\b(per night|nightly|a night|\/night|per day|daily rate|per week|weekly rate|airbnb|homestay|home stay|short[- ]?stay|short[- ]?term|holiday (let|rental|home)|vacation rental|staycation|booking\.com|agoda)\b/i

export function shortStayProblem(input: { title?: unknown; description?: unknown; minLease?: unknown }): string | null {
  const text = `${input.title ?? ""} ${input.description ?? ""}`
  if (SHORT_STAY.test(text)) {
    return `We list long-term rentals only (${MIN_LEASE_MONTHS} months or more), not holiday or short stays.`
  }
  const months = Number(String(input.minLease ?? "").replace(/[^0-9]/g, ""))
  if (String(input.minLease ?? "").trim() && Number.isFinite(months) && months > 0 && months < MIN_LEASE_MONTHS) {
    return `The minimum lease must be at least ${MIN_LEASE_MONTHS} months. We list long-term rentals only.`
  }
  return null
}

// Rentals live in the same Property table as sales. A rental is marked in
// its metadata ("saleType":"rent"); its price is the rent per month.
// Optional rental details also sit in metadata: deposit, furnished,
// availableFrom (YYYY-MM-DD) and minLeaseMonths.

export const RENT_MARK = '"saleType":"rent"'

export const rentWhere: Prisma.PropertyWhereInput = { metadata: { contains: RENT_MARK } }
export const notRentWhere: Prisma.PropertyWhereInput = {
  OR: [{ metadata: null }, { NOT: { metadata: { contains: RENT_MARK } } }],
}

export function isRental(metadata: string | null | undefined): boolean {
  return Boolean(metadata && metadata.includes(RENT_MARK))
}

export function perMonth(label: string, rental: boolean) {
  return rental ? `${label} / month` : label
}

// Reads a "for sale or rent" answer from a form or spreadsheet cell.
export function readDeal(value: unknown): "rent" | "sale" | null {
  const text = String(value ?? "").trim().toLowerCase()
  if (!text) return null
  if (/rent|let|lease|sewa|tenant/.test(text)) return "rent"
  if (/sale|sell|buy|jual/.test(text)) return "sale"
  return null
}

export const FURNISHED = ["Furnished", "Partly furnished", "Unfurnished"] as const

export function readFurnished(value: unknown): string | null {
  const text = String(value ?? "").trim().toLowerCase()
  if (!text) return null
  if (/^(un|not|no\b|none|bare|empty)/.test(text)) return "Unfurnished"
  if (/part|semi/.test(text)) return "Partly furnished"
  if (/fur|yes|full/.test(text)) return "Furnished"
  return null
}

// Builds the rental part of a listing's metadata from loose input.
export function rentalMetadata(input: {
  deposit?: unknown
  furnished?: unknown
  availableFrom?: unknown
  minLease?: unknown
}): Record<string, string | number> {
  const meta: Record<string, string | number> = { saleType: "rent" }
  const deposit = Number(String(input.deposit ?? "").replace(/[^0-9.]/g, ""))
  if (Number.isFinite(deposit) && deposit > 0) meta.deposit = Math.round(deposit)
  const furnished = readFurnished(input.furnished)
  if (furnished) meta.furnished = furnished
  const date = String(input.availableFrom ?? "").trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) meta.availableFrom = date.slice(0, 10)
  else if (/^(now|immediate|today)/i.test(date)) meta.availableFrom = "Now"
  const months = Number(String(input.minLease ?? "").replace(/[^0-9]/g, ""))
  if (Number.isInteger(months) && months > 0 && months <= 120) meta.minLeaseMonths = months
  return meta
}
