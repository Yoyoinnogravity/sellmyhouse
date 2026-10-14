import { mapLabelUrl, mapTileUrl } from "@/lib/mapTiles"

function tilePosition(lat: number, lng: number, zoom: number) {
  const scale = 2 ** zoom
  const x = ((lng + 180) / 360) * scale
  const latRad = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale
  const tileX = Math.floor(x)
  const tileY = Math.floor(y)
  return {
    tileX,
    tileY,
    left: (x - tileX) * 100,
    top: (y - tileY) * 100,
  }
}

export function MapThumbnail({ lat, lng, label }: { lat: number; lng: number; label: string }) {
  const zoom = 13
  const { tileX, tileY, left, top } = tilePosition(lat, lng, zoom)
  const src = mapTileUrl(zoom, tileX, tileY)
  const labels = mapLabelUrl(zoom, tileX, tileY)

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
      {/* Map tiles are served as plain images so the pin can sit on the tile. */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <img src={labels} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <span
        className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-50 bg-orange-500"
        style={{ left: `${left}%`, top: `${top}%` }}
      />
      <span className="sr-only">Map of {label}</span>
    </div>
  )
}
