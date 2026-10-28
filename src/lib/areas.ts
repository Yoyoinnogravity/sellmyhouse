// Area pages (/in/kuala-lumpur) for search engines and visitors.

export function areaSlug(place: string): string {
  return place
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function areaName(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bKl\b/g, "KL")
    .replace(/\bKlcc\b/g, "KLCC");
}

// Greater KL areas linked from the home page, where the site is focusing first.
export const KL_AREAS = [
  "Kuala Lumpur",
  "Mont Kiara",
  "Bangsar",
  "KLCC",
  "Cheras",
  "Setapak",
  "Bukit Jalil",
  "Sentul",
  "Wangsa Maju",
  "Kepong",
  "Petaling Jaya",
  "Subang Jaya",
  "Shah Alam",
  "Puchong",
  "Cyberjaya",
  "Selangor",
];
