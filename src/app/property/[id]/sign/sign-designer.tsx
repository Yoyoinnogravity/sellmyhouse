"use client";

import { useEffect, useRef, useState } from "react";

type Size = "A1" | "A2" | "A3" | "A4";
type Orientation = "portrait" | "landscape";

// ISO 216 paper sizes in millimetres (short side, long side).
const SIZES: Record<Size, [number, number]> = {
  A1: [594, 841],
  A2: [420, 594],
  A3: [297, 420],
  A4: [210, 297],
};

const SIZE_NOTES: Record<Size, string> = {
  A4: "Home printer",
  A3: "Some home printers",
  A2: "Print shop",
  A1: "Print shop, large",
};

export default function SignDesigner({
  qrSvg,
  host,
  listingPath,
  qrDownload,
  price,
  title,
  location,
  details,
  phone,
  photo,
}: {
  qrSvg: string;
  host: string;
  listingPath: string;
  qrDownload: string;
  price: string;
  title: string;
  location: string;
  details: string;
  phone: string | null;
  photo: string | null;
}) {
  const [size, setSize] = useState<Size>("A3");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [withPhoto, setWithPhoto] = useState(Boolean(photo));
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const [short, long] = SIZES[size];
  const width = orientation === "portrait" ? short : long;
  const height = orientation === "portrait" ? long : short;
  // Every measurement is a share of the short side, so all sizes look alike.
  const u = short / 100;
  const mm = (value: number) => `${(value * u).toFixed(2)}mm`;

  // Scale the full-size sheet down to fit the screen preview.
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const fit = () => {
      const pxPerMm = 96 / 25.4;
      const available = element.clientWidth;
      setScale(Math.min(1, available / (width * pxPerMm)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  const showPhoto = withPhoto && photo;
  const landscape = orientation === "landscape";
  const pxPerMm = 96 / 25.4;

  const choice = (active: boolean) =>
    `min-h-[44px] border-2 px-4 font-semibold ${active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white"}`;

  const qrBlock = (
    <div className="flex flex-col items-center" style={{ gap: mm(1.5) }}>
      <div
        style={{ width: mm(landscape ? 34 : 30), height: mm(landscape ? 34 : 30) }}
        // The QR code is an SVG made on our server from the listing link.
        dangerouslySetInnerHTML={{ __html: qrSvg }}
        className="[&>svg]:h-full [&>svg]:w-full"
      />
      <p style={{ fontSize: mm(2.6), lineHeight: 1.15 }} className="text-center font-bold">
        Scan for photos
        <br />
        and details
      </p>
      <p style={{ fontSize: mm(1.9) }} className="text-center whitespace-nowrap text-zinc-700">{listingPath}</p>
    </div>
  );

  const phoneBlock = phone ? (
    <div>
      <p style={{ fontSize: mm(3.2) }} className="font-bold tracking-wide uppercase text-zinc-600">Call or WhatsApp</p>
      <p style={{ fontSize: mm(landscape ? 7.5 : 8), lineHeight: 1.05 }} className="font-black whitespace-nowrap">{phone}</p>
    </div>
  ) : (
    <p style={{ fontSize: mm(4.5), lineHeight: 1.15 }} className="font-bold">Scan the code to contact the seller</p>
  );

  return (
    <div className="flex flex-col gap-6">
      <style>{`
        @page { size: ${width}mm ${height}mm; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          #for-sale-sign, #for-sale-sign * { visibility: visible !important; }
          #for-sale-sign { position: fixed !important; left: 0; top: 0; transform: none !important; box-shadow: none !important; }
          #sign-preview-box { height: auto !important; }
        }
      `}</style>

      <div className="flex flex-col gap-4 print:hidden">
        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">Paper size</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SIZES) as Size[]).map((option) => (
              <button key={option} type="button" onClick={() => setSize(option)} className={choice(size === option)} aria-pressed={size === option}>
                {option} <span className="text-xs font-normal opacity-80">· {SIZE_NOTES[option]}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-semibold">Layout</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setOrientation("portrait")} className={choice(!landscape)} aria-pressed={!landscape}>
              Portrait (tall)
            </button>
            <button type="button" onClick={() => setOrientation("landscape")} className={choice(landscape)} aria-pressed={landscape}>
              Landscape (wide)
            </button>
          </div>
        </fieldset>
        {photo ? (
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={withPhoto} onChange={(event) => setWithPhoto(event.target.checked)} className="h-5 w-5" />
            Include my first photo
          </label>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[52px] bg-orange-600 px-6 text-lg font-semibold text-white hover:bg-orange-700"
          >
            Print or save as PDF ({size}, {orientation})
          </button>
          <a
            href={qrDownload}
            className="inline-flex min-h-[52px] items-center justify-center border-2 border-zinc-900 px-5 font-semibold"
          >
            Download QR code only
          </a>
          <p className="text-sm text-zinc-600">
            {size === "A1" || size === "A2"
              ? "Choose “Save as PDF” in the print window, then take or email the PDF to a print shop."
              : "Pick your printer, or “Save as PDF”. Set the paper size in the print window to " + size + "."}
          </p>
        </div>
      </div>

      {/* Preview, scaled to the screen. The sign itself is full size in millimetres. */}
      <div ref={frame} className="w-full">
        <div id="sign-preview-box" style={{ height: height * pxPerMm * scale }} className="overflow-hidden">
          <div
            id="for-sale-sign"
            style={{
              width: `${width}mm`,
              height: `${height}mm`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
            className="flex flex-col overflow-hidden bg-white text-zinc-900 shadow-[0_2px_12px_rgb(0_0_0/0.25)]"
          >
            {/* FOR SALE band */}
            <div
              style={{ padding: `${mm(3)} ${mm(5)}`, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
              className="flex items-center justify-center bg-orange-600 text-white"
            >
              <p style={{ fontSize: mm(landscape ? 13 : 15), lineHeight: 1, letterSpacing: "0.02em" }} className="font-black">
                FOR SALE
              </p>
            </div>

            {/* Body */}
            <div
              style={{ padding: mm(5), gap: mm(4) }}
              className={`flex min-h-0 flex-1 ${landscape ? "flex-row" : "flex-col"}`}
            >
              <div style={{ gap: mm(3) }} className="flex min-h-0 min-w-0 flex-1 flex-col">
                <p style={{ fontSize: mm(landscape ? 10 : 11), lineHeight: 1 }} className="font-black">{price}</p>
                <div>
                  <p style={{ fontSize: mm(4.4), lineHeight: 1.15 }} className="line-clamp-2 font-bold">{title}</p>
                  {location || details ? (
                    <p style={{ fontSize: mm(3.4), lineHeight: 1.2, marginTop: mm(1) }} className="line-clamp-2 text-zinc-700">
                      {[details, location].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                {showPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="min-h-0 w-full flex-1 object-cover" />
                ) : (
                  <div className="flex-1" />
                )}
                {landscape ? phoneBlock : null}
              </div>

              {landscape ? (
                <div style={{ gap: mm(3) }} className="flex shrink-0 flex-col items-center justify-center">{qrBlock}</div>
              ) : (
                <div style={{ gap: mm(4) }} className="flex items-end justify-between">
                  <div className="min-w-0 flex-1">{phoneBlock}</div>
                  {qrBlock}
                </div>
              )}
            </div>

            {/* Website band: the site address, big. */}
            <div
              style={{ padding: `${mm(3)} ${mm(5)}`, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
              className="flex flex-col items-center bg-zinc-900 text-center text-white"
            >
              <p style={{ fontSize: mm(landscape ? 6.5 : 7.5), lineHeight: 1.05 }} className="font-black">{host}</p>
              <p style={{ fontSize: mm(2.8), marginTop: mm(0.8) }} className="text-zinc-200">
                Buy or sell any property, anywhere. List yours free, no agent fees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
