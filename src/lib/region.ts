export type PropertyRegion = {
  city: string;
  country: string;
};

export function propertyRegion(location: string): PropertyRegion | null {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  return {
    city: parts[0],
    country: parts[parts.length - 1],
  };
}

export function samePlace(left: string | null | undefined, right: string) {
  if (!left) return false;
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

export function regionPath(region: PropertyRegion) {
  return `/agents/${encodeURIComponent(region.country)}/${encodeURIComponent(region.city)}`;
}
