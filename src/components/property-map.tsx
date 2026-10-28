"use client"

import dynamic from "next/dynamic"
import type { MapProperty } from "@/lib/places"

const Canvas = dynamic(() => import("./property-map-canvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-zinc-100" />,
})

export function PropertyMap({
  points,
  variant,
}: {
  points: MapProperty[]
  variant: "world" | "place"
}) {
  if (points.length === 0) {
    return <p className="text-sm text-zinc-500">No homes to show on the map yet.</p>
  }

  return (
    <div
      className={
        variant === "world"
          ? "isolate h-72 w-full overflow-hidden border sm:h-96"
          : "isolate h-64 w-full overflow-hidden border sm:h-full sm:min-h-72"
      }
    >
      <Canvas points={points} variant={variant} />
    </div>
  )
}
