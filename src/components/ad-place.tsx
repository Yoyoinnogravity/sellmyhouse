"use client";

import { useEffect } from "react";
import { setAdPlace } from "@/lib/adPlace";

// Drop onto a page to tell the adverts which place the visitor is looking at.
export function AdPlace({ place }: { place: string | null | undefined }) {
  useEffect(() => {
    if (place) setAdPlace(place);
  }, [place]);
  return null;
}
