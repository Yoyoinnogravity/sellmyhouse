export type SaleKind = "private" | "developer"

export function listingKind(metadata: string | null): SaleKind {
  if (!metadata) return "private"
  try {
    const parsed = JSON.parse(metadata) as { register?: unknown }
    return parsed.register === "TEDUH" ? "developer" : "private"
  } catch {
    return "private"
  }
}

export function saleKind(value: string | undefined): SaleKind {
  return value === "developer" ? "developer" : "private"
}
