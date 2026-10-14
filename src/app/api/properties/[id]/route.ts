import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/developerAccess";
import { listingImages } from "@/lib/listingImage";
import { ListingPhotoError, removeListingPhotos, saveListingPhotos } from "@/lib/listingPhotos";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/lib/session";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+().\-\s]+$/;

async function editableProperty(userId: number, userEmail: string, id: number) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) return null;
  if (property.claimedById !== userId && !isAdminEmail(userEmail)) return null;
  return property;
}

function readWebsite(metadata: string | null): string {
  if (!metadata) return "";
  try {
    const parsed = JSON.parse(metadata) as { website?: unknown };
    return typeof parsed.website === "string" ? parsed.website : "";
  } catch {
    return "";
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }
  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) {
    return NextResponse.json({ error: "Unknown listing." }, { status: 404 });
  }
  const property = await editableProperty(user.id, user.email, propertyId);
  if (!property) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  return NextResponse.json({
    item: {
      id: property.id,
      title: property.title,
      price: property.price,
      location: property.location,
      description: property.description ?? "",
      contactPhone: property.contactPhone ?? "",
      contactEmail: property.contactEmail ?? "",
      website: readWebsite(property.metadata),
      photos: listingImages(property.images, property.image),
    },
  });
}

function text(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }
  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) {
    return NextResponse.json({ error: "Unknown listing." }, { status: 404 });
  }
  const property = await editableProperty(user.id, user.email, propertyId);
  if (!property) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const type = request.headers.get("content-type") ?? "";
  let title = property.title;
  let price = property.price;
  let description = property.description ?? "";
  let contactPhone = property.contactPhone ?? "";
  let contactEmail = property.contactEmail ?? "";
  let website = readWebsite(property.metadata);
  let photos: Blob[] = [];

  if (type.includes("multipart/form-data")) {
    const form = await request.formData();
    title = text(form.get("title"), 140);
    const rawPrice = text(form.get("price"), 12);
    price = /^\d+$/.test(rawPrice) ? Number(rawPrice) : NaN;
    description = text(form.get("description"), 2000);
    contactPhone = text(form.get("contactPhone"), 30);
    contactEmail = text(form.get("contactEmail"), 120).toLowerCase();
    website = text(form.get("website"), 200);
    photos = form.getAll("photos").filter((item) => item instanceof Blob);
  } else {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    if (typeof body.title === "string") title = body.title.trim().slice(0, 140);
    if (typeof body.price === "number" || typeof body.price === "string") {
      const raw = String(body.price).trim();
      price = /^\d+$/.test(raw) ? Number(raw) : NaN;
    }
    if (typeof body.description === "string") description = body.description.trim().slice(0, 2000);
    if (typeof body.contactPhone === "string") contactPhone = body.contactPhone.trim().slice(0, 30);
    if (typeof body.contactEmail === "string") contactEmail = body.contactEmail.trim().slice(0, 120).toLowerCase();
    if (typeof body.website === "string") website = body.website.trim().slice(0, 200);
  }

  if (title.length < 3) {
    return NextResponse.json({ error: "Give the listing a title." }, { status: 400 });
  }
  if (!Number.isInteger(price) || price < 1 || price > 999999999) {
    return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
  }
  if (contactPhone && (contactPhone.replace(/\D/g, "").length < 6 || !phonePattern.test(contactPhone))) {
    return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  }
  if (contactEmail && !emailPattern.test(contactEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (website && !/^https?:\/\//i.test(website)) {
    website = `https://${website}`;
  }
  if (website && (website.length > 200 || /\s/.test(website))) {
    return NextResponse.json({ error: "Enter a website address." }, { status: 400 });
  }

  let image = property.image;
  let images = property.images;
  if (photos.length > 0) {
    let urls: string[] = [];
    try {
      urls = await saveListingPhotos(photos);
    } catch (error) {
      const message = error instanceof ListingPhotoError ? error.message : "The pictures could not be saved.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const replaced = listingImages(property.images, property.image);
    image = urls[0] ?? null;
    images = urls.length > 0 ? JSON.stringify(urls) : null;
    await removeListingPhotos(replaced);
  }

  let metadata = property.metadata;
  try {
    const parsed = metadata ? (JSON.parse(metadata) as Record<string, unknown>) : {};
    if (website) parsed.website = website;
    else delete parsed.website;
    metadata = JSON.stringify(parsed);
  } catch {
    metadata = website ? JSON.stringify({ website }) : null;
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      title,
      price,
      description: description || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      image,
      images,
      metadata,
    },
  });

  return NextResponse.json({ ok: true });
}
