import { PropertyMap } from "@/components/property-map"
import type { SaleKind } from "@/lib/listingKind"
import { listMapPoints } from "@/lib/mappedProperties"
import { spreadPoints } from "@/lib/places"
import { currentSite } from "@/lib/site"

export async function WorldMapSection({ sale }: { sale?: SaleKind }) {
  const [listings, site] = await Promise.all([listMapPoints(sale), currentSite()])

  return (
    <div className="flex flex-col gap-2">
      <PropertyMap points={spreadPoints(listings)} variant="world" />
      <p className="text-xs text-zinc-500">
        Each pin shows the lowest price still on offer. Drag the map and select {site.withArticle}. © queeniemella | © OpenStreetMap contributors.
      </p>
    </div>
  )
}
