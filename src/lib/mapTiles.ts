const IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile"
const LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile"

export const MAP_TILES = `${IMAGERY}/{z}/{y}/{x}`
export const MAP_LABELS = `${LABELS}/{z}/{y}/{x}`

export const MAP_ATTRIBUTION =
  'Imagery © <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community'

export function mapTileUrl(zoom: number, x: number, y: number) {
  return `${IMAGERY}/${zoom}/${y}/${x}`
}

export function mapLabelUrl(zoom: number, x: number, y: number) {
  return `${LABELS}/${zoom}/${y}/${x}`
}

export function aerialPhotoUrl(lat: number, lng: number) {
  const zoom = 19
  const scale = 2 ** zoom
  const x = Math.floor(((lng + 180) / 360) * scale)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale)
  return mapTileUrl(zoom, x, y)
}
