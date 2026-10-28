import { NextResponse } from "next/server";
import { removeListingPhotos } from "@/lib/listingPhotos";
import { listingImages } from "@/lib/listingImage";
import { manageKeyMatches } from "@/lib/manageKey";
import { prisma } from "@/lib/prisma";
import { APLS } from "@/lib/propertyStandard";

// Seller self-service without an account: everything here needs the
// listing's private manage key, sent in the request body.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  let body: { key?: unknown; action?: unknown; title?: unknown; price?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, title: true, price: true, location: true, description: true, metadata: true, image: true, images: true },
  });
  if (!property || !manageKeyMatches(property.metadata, body.key)) {
    return NextResponse.json(
      { error: "This private link doesn't match the listing. Check you copied all of it." },
      { status: 403 },
    );
  }

  if (body.action === "load") {
    return NextResponse.json({
      title: property.title,
      price: property.price,
      location: property.location,
      description: property.description ?? "",
    });
  }

  if (body.action === "update") {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const price = Number(String(body.price ?? "").replace(/[^0-9]/g, ""));
    if (!title || title.length > APLS.titleMax) {
      return NextResponse.json({ error: `Enter a title up to ${APLS.titleMax} characters.` }, { status: 400 });
    }
    if (!Number.isInteger(price) || price < APLS.priceMin || price > APLS.priceMax) {
      return NextResponse.json({ error: "Enter the asking price as a whole number." }, { status: 400 });
    }
    if (description.length > 5000) {
      return NextResponse.json({ error: "Keep the description under 5,000 characters." }, { status: 400 });
    }
    await prisma.property.update({
      where: { id },
      data: { title, price, description: description || null },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove") {
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
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
