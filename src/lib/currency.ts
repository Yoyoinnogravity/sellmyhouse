// The usual currency for a listing's country, used when a seller doesn't
// give one (the quick form never asks).
const BY_COUNTRY: [RegExp, string][] = [
  [/malaysia|kuala lumpur|selangor|penang|pulau pinang|johor|perak|melaka|malacca|sabah|sarawak|kedah|kelantan|pahang|terengganu|negeri sembilan|perlis|putrajaya|labuan/i, "MYR"],
  [/singapore/i, "SGD"],
  [/thailand|bangkok|phuket|chiang mai/i, "THB"],
  [/indonesia|jakarta|bali/i, "IDR"],
  [/philippines|manila|cebu/i, "PHP"],
  [/vietnam|viet nam|ho chi minh|hanoi/i, "VND"],
  [/hong kong/i, "HKD"],
  [/japan|tokyo|osaka/i, "JPY"],
  [/australia/i, "AUD"],
  [/new zealand/i, "NZD"],
  [/united kingdom|england|scotland|wales|northern ireland|\buk\b|london/i, "GBP"],
  [/united states|\busa\b|\bu\.s\./i, "USD"],
  [/canada/i, "CAD"],
  [/india\b/i, "INR"],
  [/united arab emirates|\buae\b|dubai|abu dhabi/i, "AED"],
  [/south africa/i, "ZAR"],
  [/portugal|spain|france|germany|italy|ireland|netherlands|belgium|austria|greece|finland|cyprus|malta/i, "EUR"],
];

export function currencyForLocation(location: string): string | null {
  for (const [pattern, code] of BY_COUNTRY) if (pattern.test(location)) return code;
  return null;
}
