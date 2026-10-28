import Link from "next/link";

// Where realtors and sellers get the upload formats:
//  - realtors: the Global Database Format for Realtors (full column set)
//  - sellers:  the Seller's Format for Individual Sellers (plain headings)
// Both upload at /upload. Column guides are on /listing-format.
export function FormatDownloads({
  compact = false,
  audience = "realtors",
}: {
  compact?: boolean;
  audience?: "realtors" | "sellers";
}) {
  const big = "inline-flex min-h-[52px] items-center justify-center gap-2 px-5 py-2 text-center text-base font-semibold";
  const sellers = audience === "sellers";
  const heading = sellers ? "Seller's Format for Individual Sellers" : "Global Database Format for Realtors";
  const file = sellers ? "seller-template" : "listing-template";
  const saveAs = sellers ? "Sellers-Format-for-Individual-Sellers" : "Global-Database-Format-for-Realtors";
  const id = `format-downloads-${audience}`;

  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col gap-4 border-2 p-5 text-zinc-900 ${sellers ? "border-green-600 bg-green-50" : "border-orange-500 bg-orange-50"}`}
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-xl font-semibold tracking-tight">{heading}</h2>
        <p className="font-semibold text-zinc-800">
          {sellers
            ? "Selling a few properties, or prefer a spreadsheet? Fill it in and upload it."
            : "Have several properties? Download the format and upload them all at once."}
        </p>
        {compact ? null : (
          <p className="text-zinc-700">
            {sellers ? (
              <>
                Simple headings like <em>Asking price</em> and <em>Your name</em>, for selling or renting out long-term. Only the{" "}
                <strong>asking price</strong>, <strong>location</strong> and <strong>your name</strong> are needed.
                Selling just one home? The <Link href="/sell" className="underline">one-page form</Link> is quicker and
                takes photos from your phone.
              </>
            ) : (
              <>
                One free spreadsheet for realtors anywhere in the world, for sales and long-term rentals. One property per row,
                up to 200 per file. Only
                the <strong>price</strong>, <strong>location</strong> (or a map pin) and <strong>your name</strong> are
                required.
              </>
            )}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={`/${file}.xlsx`}
          download={`${saveAs}.xlsx`}
          className={`${big} text-white ${sellers ? "bg-green-700 hover:bg-green-800" : "bg-orange-600 hover:bg-orange-700"}`}
        >
          {sellers ? "Download the Seller's Format (Excel)" : "Download the Global Database Format (Excel)"}
        </a>
        <a
          href={`/${file}.csv`}
          download={`${saveAs}.csv`}
          className={`${big} border-2 bg-white ${sellers ? "border-green-700 hover:bg-green-100" : "border-orange-600 hover:bg-orange-100"}`}
        >
          Download as CSV
        </a>
        <Link href="/upload" className={`${big} bg-zinc-900 text-white hover:bg-zinc-700`}>
          Upload your file
        </Link>
      </div>
      <p className="text-sm text-zinc-700">
        <Link href={`/listing-format#${audience}`} className="underline">What goes in each column</Link>
        {sellers ? null : (
          <>
            {" · "}
            <a href="/listing-example.csv" download className="underline">Example file with 3 listings</a>
          </>
        )}
        {" · "}No account needed
      </p>
    </section>
  );
}
