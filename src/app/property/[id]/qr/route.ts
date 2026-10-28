import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { currentSite } from "@/lib/site";

// This listing's own QR code as a PNG (?download=1 saves it as a file).
// Each code holds the listing's address, so every listing's code is unique.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propertyId = Number(id);
  if (!Number.isInteger(propertyId)) return new Response("Not found", { status: 404 });
  const exists = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
  if (!exists) return new Response("Not found", { status: 404 });

  const site = await currentSite();
  const png = await QRCode.toBuffer(`https://${site.host}/property/${propertyId}`, {
    type: "png",
    width: 1200,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  const download = new URL(request.url).searchParams.has("download");
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      ...(download ? { "Content-Disposition": `attachment; filename="${site.host}-listing-${propertyId}-qr.png"` } : {}),
    },
  });
}
