import Link from "next/link"
import { unstable_rethrow } from "next/navigation"
import { PropertyMap } from "@/components/property-map"
import type { SaleKind } from "@/lib/listingKind"
import { listingTypeChoice, type ListingSearch } from "@/lib/listingSearch"
import { listMapPoints } from "@/lib/mappedProperties"
import { spreadPoints } from "@/lib/places"
import { currentSite } from "@/lib/site"

export async function WorldMapSection({ sale, search }: { sale?: SaleKind; search?: ListingSearch }) {
  let listings: Awaited<ReturnType<typeof listMapPoints>>
  try {
    listings = await listMapPoints(sale, search)
  } catch (error) {
    unstable_rethrow(error)
    return (
      <div className="flex flex-col gap-2 border p-6 text-center">
        <p className="font-semibold">The map is taking a short break.</p>
        <p className="text-sm text-zinc-600">
          Listings will be back shortly. You can still{" "}
          <Link href="/sell" className="underline">list your property for free</Link>.
        </p>
      </div>
    )
  }
  const site = await currentSite()
  const article =
    (search?.type ? listingTypeChoice(search.type)?.withArticle : null) ??
    (sale === "developer" ? "a listing" : site.withArticle)

  return (
    <div className="flex flex-col gap-2">
      <PropertyMap points={spreadPoints(listings)} variant="world" />
      <p className="text-sm text-zinc-600">
        Tap a price to see {article}. Drag to move around, pinch or use + and − to zoom. Where a development has
        several units, the pin shows the cheapest.
      </p>
    </div>
  )
}
