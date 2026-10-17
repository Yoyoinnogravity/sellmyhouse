import { REQUEST_INBOX_FALLBACK } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase() || REQUEST_INBOX_FALLBACK;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = adminEmail();
  return admin.length > 0 && (email ?? "").trim().toLowerCase() === admin;
}

export async function canEditProperty(userId: number, propertyId: number): Promise<boolean> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { claimedById: true },
  });
  return property?.claimedById === userId;
}

export function parseListingIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value
    .map((item) => (typeof item === "number" && Number.isInteger(item) ? item : typeof item === "string" && /^\d+$/.test(item.trim()) ? Number(item.trim()) : null))
    .filter((item): item is number => item != null && item > 0);
  const unique = [...new Set(ids)];
  if (unique.length === 0 || unique.length > 200) return null;
  return unique;
}
