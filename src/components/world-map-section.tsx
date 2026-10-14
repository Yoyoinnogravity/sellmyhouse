import { PropertyMap } from "@/components/property-map"
import type { SaleKind } from "@/lib/listingKind"
import { listingTypeChoice, type ListingSearch } from "@/lib/listingSearch"
import { listMapPoints } from "@/lib/mappedProperties"
import { spreadPoints } from "@/lib/places"
import { currentSite } from "@/lib/site"

export async function WorldMapSection({ sale, search }: { sale?: SaleKind; search?: ListingSearch }) {
  const [listings, site] = await Promise.all([listMapPoints(sale, search), currentSite()])
  const article =
    (search?.type ? listingTypeChoice(search.type)?.withArticle : null) ??
    (sale === "developer" ? "a listing" : site.withArticle)

  return (
    <div className="flex flex-col gap-2">
      <PropertyMap points={spreadPoints(listings)} variant="world" />
      <p className="text-xs text-zinc-500">
        Each pin shows the lowest price still on offer. Drag or pinch the map and select {article}. Imagery © Esri.
      </p>
    </div>
  )
}
