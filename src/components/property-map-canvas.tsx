"use client"

import { useEffect } from "react"
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet"
import L from "leaflet"
import { MAP_ATTRIBUTION, MAP_LABELS, MAP_TILES } from "@/lib/mapTiles"
import type { MapProperty } from "@/lib/places"
import "leaflet/dist/leaflet.css"

function Frame({ points, variant }: { points: MapProperty[]; variant: "world" | "place" }) {
  const map = useMap()

  useEffect(() => {
    if (points.length === 0) return
    if (variant === "place" || points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14)
      return
    }
    map.fitBounds(
      points.map((point) => [point.lat, point.lng]),
      { padding: [28, 28], maxZoom: 5 },
    )
  }, [map, points, variant])

  return null
}

// A "World" button on the map: zooms right out to the whole globe.
function WorldButton() {
  const map = useMap()
  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const button = L.DomUtil.create("button", "")
        button.type = "button"
        button.textContent = "World"
        button.title = "Zoom out to the whole world"
        button.style.cssText =
          "background:#fff;border:2px solid rgba(0,0,0,0.3);border-radius:4px;padding:6px 10px;font:600 13px Arial,Helvetica,sans-serif;cursor:pointer"
        L.DomEvent.disableClickPropagation(button)
        L.DomEvent.on(button, "click", () => map.setView([20, 0], 2))
        return button
      },
    })
    const control = new Control({ position: "topright" })
    control.addTo(map)
    return () => {
      control.remove()
    }
  }, [map])
  return null
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;"
    if (char === "<") return "&lt;"
    if (char === ">") return "&gt;"
    if (char === '"') return "&quot;"
    return "&#39;"
  })
}

function pinLabel(point: MapProperty) {
  const price = point.priceLabel.replace(" / month", "/mo")
  return (point.offerCount ?? 1) > 1 ? `From ${price}` : price
}

function WorldMarkers({ points }: { points: MapProperty[] }) {
  const map = useMap()

  useEffect(() => {
    const layer = L.layerGroup()
    for (const point of points) {
      const label = pinLabel(point)
      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          className: "price-pin",
          html: `<span style="position:absolute;left:0;top:0;transform:translate(-50%,-130%);cursor:pointer;background:#f97316;color:#fff7ed;border:2px solid #fff7ed;border-radius:999px;padding:2px 8px;font:600 12px/1.3 Arial,Helvetica,sans-serif;white-space:nowrap;box-shadow:0 1px 2px rgb(0 0 0 / 35%)">${escapeHtml(label)}</span>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        keyboard: true,
        title: label,
      })
      const offers = point.offerCount ?? 1
      const count = offers > 1 ? `<br>Lowest of ${offers} unit types` : ""
      // A tap or click on the price goes straight to the property's own page.
      marker.bindTooltip(
        `<strong>${escapeHtml(point.title)}</strong><br>${escapeHtml(label)}${count}<br>${escapeHtml(point.location)}`,
        { direction: "top", offset: [0, -28] },
      )
      marker.on("click", () => {
        window.location.assign(`/property/${point.id}`)
      })
      marker.on("keypress", (event: L.LeafletKeyboardEvent) => {
        if (event.originalEvent.key === "Enter") window.location.assign(`/property/${point.id}`)
      })
      marker.addTo(layer)
    }
    layer.addTo(map)
    return () => {
      map.removeLayer(layer)
    }
  }, [map, points])

  return null
}

export default function PropertyMapCanvas({
  points,
  variant,
}: {
  points: MapProperty[]
  variant: "world" | "place"
}) {
  const first = points[0]

  return (
    <MapContainer
      center={first ? [first.lat, first.lng] : [20, 0]}
      zoom={variant === "world" ? 2 : 14}
      scrollWheelZoom
      touchZoom
      /* Prototype: on touch devices one finger scrolls the page (see the
         touch-action rule in globals.css) and pinch still zooms. */
      dragging={!L.Browser.mobile}
      doubleClickZoom
      zoomControl
      attributionControl
      preferCanvas
      className="h-full w-full"
      /* Prototype: inline so it beats Leaflet's own
         .leaflet-touch-zoom{touch-action:none} rule. One finger pans the
         page (browser-owned), two fingers pinch the map (Leaflet-owned). */
      style={{ touchAction: "pan-x pan-y" }}
    >
      <TileLayer attribution={MAP_ATTRIBUTION} maxZoom={19} url={MAP_TILES} />
      <TileLayer attribution="" maxZoom={19} url={MAP_LABELS} />
      <Frame points={points} variant={variant} />
      {variant === "world" ? <WorldButton /> : null}
      {variant === "world" ? (
        <WorldMarkers points={points} />
      ) : (
        points.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={10}
            pathOptions={{ color: "#fff7ed", fillColor: "#f97316", fillOpacity: 0.95, weight: 2 }}
          />
        ))
      )}
    </MapContainer>
  )
}
