// This listing's own QR code: scan it to open the listing, or download it
// for flyers, WhatsApp status or a window card. Each listing's code is unique.
export function ListingQr({ id, large = false }: { id: number; large?: boolean }) {
  const size = large ? "h-44 w-44" : "h-24 w-24";
  return (
    <div className={`flex gap-4 border p-3 ${large ? "flex-col items-center bg-white text-center sm:flex-row sm:text-left" : "items-center"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/property/${id}/qr`} alt="QR code for this listing" className={`${size} shrink-0`} />
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-semibold">{large ? "Your listing's QR code" : "QR code for this listing"}</p>
        <p className="text-zinc-600">Scan it with a phone camera to open this listing.</p>
        <div className={`flex flex-wrap gap-2 ${large ? "justify-center sm:justify-start" : ""}`}>
          <a href={`/property/${id}/qr?download=1`} className="inline-flex min-h-[40px] items-center border-2 border-zinc-900 px-3 font-semibold whitespace-nowrap">
            Download QR code
          </a>
          <a href={`/property/${id}/sign`} className="inline-flex min-h-[40px] items-center border px-3 whitespace-nowrap">
            Print a sign
          </a>
        </div>
      </div>
    </div>
  );
}
