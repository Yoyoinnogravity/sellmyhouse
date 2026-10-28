// Real conveyancing firms, shown in the side panel as a plain directory
// (not as paid adverts) until firms take a paid placement. Names and towns
// come from public listings (Lawzana, SingaporeLegalAdvice.com, the Law
// Society of Singapore, the Malaysian Bar, Hiredly), checked October 2026.
// Websites are only given where the firm's own site was confirmed; others
// link to a web search for the firm. A firm can ask to be removed via
// /advertise.

export type DirectoryFirm = {
  firm: string;
  city: string;
  country: string;
  website?: string;
};

export const CONVEYANCER_DIRECTORY: DirectoryFirm[] = [
  // Ipoh, Perak
  { firm: "K.W. Chong & Partners", city: "Ipoh", country: "Malaysia" },
  { firm: "Kenneth William & Associates", city: "Ipoh", country: "Malaysia" },
  { firm: "Mad Diah Faizal & Co.", city: "Ipoh", country: "Malaysia" },
  { firm: "Kbtan, Kumar & Partners", city: "Ipoh", country: "Malaysia" },
  { firm: "Tay Ibrahim & Partners", city: "Ipoh", country: "Malaysia" },
  { firm: "Gibb & Co.", city: "Ipoh", country: "Malaysia" },
  // Penang
  { firm: "C K Lim & Partners", city: "Bayan Lepas", country: "Malaysia" },
  { firm: "Ng Law Firm", city: "Bayan Lepas", country: "Malaysia" },
  // Klang Valley
  { firm: "Yong Chen Lim & Saridah", city: "Petaling Jaya", country: "Malaysia" },
  { firm: "Khalid Iqbal & Associates", city: "Kuala Lumpur", country: "Malaysia" },
  { firm: "Kenneth William & Associates", city: "Petaling Jaya", country: "Malaysia" },
  // Singapore
  { firm: "Yuen Law LLC", city: "Singapore", country: "Singapore", website: "https://yuenlaw.com.sg/" },
  { firm: "PKWA Law Practice LLC", city: "Singapore", country: "Singapore", website: "https://pkwalaw.com/" },
  { firm: "B R Law Corporation", city: "Singapore", country: "Singapore" },
  { firm: "Adel Law LLC", city: "Singapore", country: "Singapore" },
  { firm: "K K Lee Law Corporation", city: "Singapore", country: "Singapore" },
  { firm: "A.W. Law LLC", city: "Singapore", country: "Singapore" },
];

// Areas a town belongs to, so a search for "Penang" or "Selangor" finds firms.
const AREAS: Record<string, string[]> = {
  "bayan lepas": ["penang", "pulau pinang", "george town", "georgetown", "butterworth"],
  "petaling jaya": ["selangor", "pj", "subang", "shah alam", "klang valley"],
  "kuala lumpur": ["kl", "klang valley", "wilayah persekutuan", "setapak", "cheras", "bangsar", "mont kiara"],
  ipoh: ["perak"],
};

export function directoryFirms(place: string, limit = 3): DirectoryFirm[] {
  const needle = place.trim().toLowerCase();
  if (!needle) return [];
  const matches = CONVEYANCER_DIRECTORY.filter((entry) => {
    const city = entry.city.toLowerCase();
    const names = [city, ...(AREAS[city] ?? [])];
    return names.some((name) => needle.includes(name) || name.includes(needle)) ||
      entry.country.toLowerCase() === needle;
  });
  const seen = new Set<string>();
  return matches.filter((entry) => !seen.has(entry.firm) && seen.add(entry.firm)).slice(0, limit);
}

export function firmLink(entry: DirectoryFirm): string {
  return entry.website ?? `https://www.google.com/search?q=${encodeURIComponent(`${entry.firm} ${entry.city} conveyancing`)}`;
}

export function searchConveyancers(place: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`conveyancing lawyer ${place}`)}`;
}
