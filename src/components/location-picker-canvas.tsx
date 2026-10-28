"use client"

import { useEffect } from "react"
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet"
import { MAP_ATTRIBUTION, MAP_LABELS, MAP_TILES } from "@/lib/mapTiles"
import "leaflet/dist/leaflet.css"

export type Pin = { lat: number; lng: number }

function ClickToPin({ onPick }: { onPick: (pin: Pin) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

function Follow({ centre, zoom }: { centre: Pin | null; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (centre) map.setView([centre.lat, centre.lng], zoom)
  }, [map, centre, zoom])
  return null
}

export default function LocationPickerCanvas({
  pin,
  centre,
  zoom,
  onPick,
}: {
  pin: Pin | null
  centre: Pin | null
  zoom: number
  onPick: (pin: Pin) => void
}) {
  return (
    <MapContainer center={[20, 0]} zoom={2} scrollWheelZoom className="h-full w-full">
      <TileLayer url={MAP_TILES} attribution={MAP_ATTRIBUTION} />
      <TileLayer url={MAP_LABELS} />
      <ClickToPin onPick={onPick} />
      <Follow centre={centre} zoom={zoom} />
      {pin ? (
        <CircleMarker
          center={[pin.lat, pin.lng]}
          radius={10}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#dc2626", fillOpacity: 1 }}
        />
      ) : null}
    </MapContainer>
  )
}
