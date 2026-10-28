"use client";

import { useEffect, useState } from "react";

// The place a visitor is interested in (the town they searched, or the
// listing they're looking at), so the adverts can be local to it. Kept in
// this browser only.
const KEY = "ad-place";
const EVENT = "ad-place-change";

// "Taman Melati, Ipoh, Perak, Malaysia" → "Ipoh"; "Lisbon, Portugal" → "Lisbon".
export function shortPlace(location: string): string {
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0 || parts[0].startsWith("Near ")) return "";
  const town = parts.length >= 3 ? parts[parts.length - 3] : parts[0];
  return town.slice(0, 40);
}

export function setAdPlace(place: string) {
  const full = place.trim().slice(0, 120);
  if (!shortPlace(full)) return;
  try {
    localStorage.setItem(KEY, full);
  } catch {
    // Storage blocked: the event below still updates this page.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: full }));
}

export function useAdPlace(): string {
  const [place, setPlace] = useState("");
  useEffect(() => {
    try {
      setPlace(localStorage.getItem(KEY) ?? "");
    } catch {
      // Ignore: ads stay general.
    }
    const onChange = (event: Event) => setPlace(String((event as CustomEvent).detail ?? ""));
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return place;
}
