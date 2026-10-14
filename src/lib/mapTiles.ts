export const MAP_TILES = "https://basemap.queeniemella.cc/tiles/countries/{z}/{x}/{y}.png"

export const MAP_ATTRIBUTION =
  '© <a href="https://queeniemella.cc">queeniemella</a> | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export function mapTileUrl(zoom: number, x: number, y: number) {
  return `https://basemap.queeniemella.cc/tiles/countries/${zoom}/${x}/${y}.png`
}
