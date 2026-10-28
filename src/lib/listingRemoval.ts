import type { Prisma } from "@/generated/prisma/client";
import { listingImages } from "@/lib/listingImage";
import { removeListingPhotos } from "@/lib/listingPhotos";
import { prisma } from "@/lib/prisma";

// Removing listings. Sellers' and realtors' listings are deleted outright,
// photos included. Imported developments are only hidden ("removed":1 in
// metadata), because the importer would otherwise bring them straight back.

export const REMOVED_MARK = '"removed":1';
export const notRemovedWhere: Prisma.PropertyWhereInput = {
  OR: [{ metadata: null }, { NOT: { metadata: { contains: REMOVED_MARK } } }],
};

export function isRemoved(metadata: string | null | undefined) {
  return Boolean(metadata && metadata.includes(REMOVED_MARK));
}

export async function deleteListing(id: number) {
  const property = await prisma.property.findUnique({ where: { id }, select: { image: true, images: true } });
  if (!property) return false;
  const photos = listingImages(property.images, property.image);
  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { propertyId: id }, select: { id: true } });
    if (lead) {
      await tx.leadUnlock.deleteMany({ where: { leadId: lead.id } });
      await tx.lead.delete({ where: { id: lead.id } });
    }
    await tx.representationRequest.deleteMany({ where: { propertyId: id } });
    await tx.property.delete({ where: { id } });
  });
  await removeListingPhotos(photos.filter((src) => src.startsWith("/uploads/")));
  return true;
}

export async function removeListing(id: number): Promise<"deleted" | "hidden" | "missing"> {
  const property = await prisma.property.findUnique({ where: { id }, select: { metadata: true } });
  if (!property) return "missing";
  if (property.metadata?.includes('"register":"TEDUH"')) {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(property.metadata) as Record<string, unknown>;
    } catch {
      meta = {};
    }
    await prisma.property.update({ where: { id }, data: { metadata: JSON.stringify({ ...meta, removed: 1 }) } });
    return "hidden";
  }
  return (await deleteListing(id)) ? "deleted" : "missing";
}
