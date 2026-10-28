import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { isAerialPhoto, isPlaceholderPhoto, listingImages, priceLabel } from "@/lib/listingImage";
import { prisma } from "@/lib/prisma";
import { currentSite } from "@/lib/site";
import SignDesigner from "./sign-designer";

export const metadata: Metadata = {
  title: "Print a For Sale sign",
  robots: { index: false, follow: false },
};

// A printable For Sale sign for any listing: A1 to A4, portrait or
// landscape, with the price, phone, a QR code to the listing and our
// website address in large print.
export default async function SignPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) notFound();

  const [site, property] = await Promise.all([
    currentSite(),
    prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        location: true,
        bedrooms: true,
        bathrooms: true,
        propertyType: true,
        contactType: true,
        contactPhone: true,
        image: true,
        images: true,
        lead: { select: { id: true } },
      },
    }),
  ]);
  if (!property) notFound();

  const url = `https://${site.host}/property/${property.id}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  // A seller who asked us to keep their number for realtors doesn't get it printed.
  const phone = property.contactType === "direct" && !property.lead ? property.contactPhone : null;
  const photo =
    listingImages(property.images, property.image).find((src) => !isPlaceholderPhoto(src) && !isAerialPhoto(src)) ?? null;
  const details = [
    property.bedrooms ? `${property.bedrooms} bed` : null,
    property.bathrooms ? `${property.bathrooms} bath` : null,
    property.propertyType,
  ].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2 print:hidden">
        <h1 className="text-3xl font-semibold tracking-tight">Print a For Sale sign</h1>
        <p className="text-zinc-700">
          Put it on your gate, fence or window. Anyone passing can scan the code to see your photos and details.{" "}
          <Link href={`/property/${property.id}`} className="underline">Back to the listing</Link>
        </p>
      </div>
      <SignDesigner
        qrSvg={qr}
        host={site.host}
        listingPath={`${site.host}/property/${property.id}`}
        qrDownload={`/property/${property.id}/qr?download=1`}
        price={priceLabel(property.currency, property.price)}
        title={property.title}
        location={property.location.startsWith("Near ") ? "" : property.location}
        details={details}
        phone={phone}
        photo={photo}
      />
    </main>
  );
}
