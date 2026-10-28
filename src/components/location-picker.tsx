"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { picturePoint } from "@/lib/places"
import type { Pin } from "./location-picker-canvas"

const Canvas = dynamic(() => import("./location-picker-canvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-zinc-100" />,
})

// Lets a seller tap the exact spot of their property. The pin is sent with
// the listing as lat and lng, so it lands in the right place on the world map.
// When the seller drops a pin without typing a place, onPlace receives the
// town and country for that spot (from OpenStreetMap), so the pin alone is
// enough to list.
export function LocationPicker({
  location,
  onPlace,
}: {
  location: string
  onPlace?: (place: string) => void
}) {
  const [pin, setPin] = useState<Pin | null>(null)
  const [centre, setCentre] = useState<Pin | null>(null)
  const [zoom, setZoom] = useState(2)
  const [note, setNote] = useState<string | null>(null)

  // Move the map to the town the seller typed, until they place a pin.
  useEffect(() => {
    if (pin || location.trim().length < 3) return
    const timer = setTimeout(() => {
      const found = picturePoint(location, null)
      if (found) {
        setCentre({ lat: found.lat, lng: found.lng })
        setZoom(13)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [location, pin])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setNote("Your browser can't share its location. Tap the map instead.")
      return
    }
    setNote("Finding you…")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const here = { lat: position.coords.latitude, lng: position.coords.longitude }
        setPin(here)
        describe(here)
        setCentre(here)
        setZoom(17)
        setNote(null)
      },
      () => setNote("We couldn't get your location. Tap the map instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function pick(next: Pin) {
    setPin(next)
    setNote(null)
    describe(next)
  }

  async function describe(spot: Pin) {
    if (!onPlace || location.trim()) return
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${spot.lat}&lon=${spot.lng}`,
        { headers: { Accept: "application/json" } },
      )
      const data = (await response.json()) as {
        address?: Record<string, string>
      }
      const a = data.address ?? {}
      const town = a.suburb ?? a.town ?? a.city ?? a.village ?? a.county ?? a.city_district
      const place = [town, a.state, a.country].filter(Boolean).join(", ")
      if (place) onPlace(place.slice(0, 120))
    } catch {
      // The pin still saves; the server describes it by its coordinates.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="isolate h-72 w-full overflow-hidden border sm:h-80">
        <Canvas pin={pin} centre={centre} zoom={zoom} onPick={pick} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={useMyLocation} className="min-h-[44px] border px-4 font-semibold">
          Use my current location
        </button>
        {pin ? (
          <button type="button" onClick={() => setPin(null)} className="min-h-[44px] px-2 text-sm underline">
            Remove pin
          </button>
        ) : null}
      </div>
      <p className="text-sm text-zinc-600" aria-live="polite">
        {note ?? (pin ? "Pinned. Tap again to move it." : "Zoom in and tap your property to drop a pin.")}
      </p>
      {pin ? (
        <>
          <input type="hidden" name="lat" value={pin.lat.toFixed(6)} />
          <input type="hidden" name="lng" value={pin.lng.toFixed(6)} />
        </>
      ) : null}
    </div>
  )
}
