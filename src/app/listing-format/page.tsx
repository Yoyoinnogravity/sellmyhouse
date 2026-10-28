import type { Metadata } from "next";
import Link from "next/link";
import { FormatDownloads } from "@/components/format-downloads";
import { LISTING_COLUMNS } from "@/lib/listingFormat";

export const metadata: Metadata = {
  title: "Listing file format for realtors and sellers",
  description:
    "Free spreadsheet template for uploading properties worldwide. Only price, location and a contact name are required.",
};

export default function ListingFormatPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">The listing file format</h1>
        <p className="text-lg text-zinc-700">
          One simple spreadsheet for listing any property, anywhere in the world: a house, a condo, a plot of land.
          Realtors can upload their whole stock at once; a seller can upload a single home.
        </p>
      </div>

      <FormatDownloads />

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">The columns</h2>
        <p className="text-zinc-700">
          Put one property on each row. Leave any optional cell blank. Columns can be in any order, and close
          names work too: <em>Asking Price</em>, <em>Beds</em>, <em>Address</em> or <em>Lat</em> are all understood.
          Columns we don&apos;t recognise are kept and shown as extra details on the listing.
        </p>
        <div className="overflow-x-auto border">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-100">
              <tr>
                <th scope="col" className="px-3 py-2">Column</th>
                <th scope="col" className="px-3 py-2">Needed?</th>
                <th scope="col" className="px-3 py-2">What to put in it</th>
              </tr>
            </thead>
            <tbody>
              {LISTING_COLUMNS.map((column) => (
                <tr key={column.name} className="border-t align-top">
                  <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{column.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {column.required ? <strong className="text-orange-700">Required</strong> : "Optional"}
                  </td>
                  <td className="px-3 py-2">{column.help}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Good to know</h2>
        <ul className="list-disc space-y-2 pl-5 text-zinc-700">
          <li>Files can be Excel (.xlsx), CSV (comma, semicolon or tab separated) or JSON. Up to 200 listings per file.</li>
          <li>
            Listings go live straight away. After uploading you get a private edit link for each listing, so you can
            change the price or remove it later. Keep that file safe.
          </li>
          <li>
            Add <span className="font-mono">latitude</span> and <span className="font-mono">longitude</span> and your
            listing appears on the exact spot on the world map, with its price as the label.
          </li>
          <li>Photos are added as links to images already online (https://…). To upload photos from your phone, use the <Link href="/sell" className="underline">one-page form</Link> instead.</li>
          <li>Listing is free for sellers and realtors, and buyers contact you directly.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">For developers: JSON</h2>
        <p className="text-zinc-700">
          Send a JSON array of objects using the same column names, for example:
        </p>
        <pre className="overflow-x-auto border bg-zinc-50 p-3 text-sm">{`[
  {
    "price": 450000,
    "currency": "MYR",
    "location": "Ipoh, Perak, Malaysia",
    "latitude": 4.5975,
    "longitude": 101.0901,
    "contact_name": "Aisha Rahman",
    "contact_phone": "+60 12 345 6789",
    "property_type": "Terrace",
    "bedrooms": 3,
    "image_urls": ["https://example.com/photo1.jpg"]
  }
]`}</pre>
      </section>
    </main>
  );
}
