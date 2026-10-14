import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/developerAccess";
import { listingImages } from "@/lib/listingImage";
import { prisma } from "@/lib/prisma";
import { getUserFromCookie } from "@/lib/session";
import ListingEditForm from "./listing-edit-form";

export const instant = false;

function readWebsite(metadata: string | null): string {
  if (!metadata) return "";
  try {
    const parsed = JSON.parse(metadata) as { website?: unknown };
    return typeof parsed.website === "string" ? parsed.website : "";
  } catch {
    return "";
  }
}

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromCookie();
  if (!user) {
    redirect("/login?next=%2Fproperties%2Fmanage");
  }
  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) {
    notFound();
  }
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    notFound();
  }
  if (property.claimedById !== user.id && !isAdminEmail(user.email)) {
    redirect("/properties/manage");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <p>
        <Link href="/properties/manage">← All my listings</Link>
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Edit listing</h1>
      <ListingEditForm
        initial={{
          id: property.id,
          title: property.title,
          price: property.price,
          location: property.location,
          description: property.description ?? "",
          contactPhone: property.contactPhone ?? "",
          contactEmail: property.contactEmail ?? "",
          website: readWebsite(property.metadata),
          photos: listingImages(property.images, property.image),
        }}
      />
    </main>
  );
}
