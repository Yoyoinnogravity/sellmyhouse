import Link from "next/link";

// The one place sellers and realtors get the listing file format.
// Shown on the home page, the sell page, the realtors page and /listing-format.
export function FormatDownloads({ compact = false }: { compact?: boolean }) {
  const big = "inline-flex min-h-[52px] items-center justify-center gap-2 px-5 text-base font-semibold";
  return (
    <section
      aria-labelledby="format-downloads-heading"
      className="flex flex-col gap-4 border-2 border-orange-500 bg-orange-50 p-5 text-zinc-900"
    >
      <div className="flex flex-col gap-1">
        <h2 id="format-downloads-heading" className="text-xl font-semibold tracking-tight">
          Have several properties? Download the listing format
        </h2>
        {compact ? null : (
          <p className="text-zinc-700">
            One free spreadsheet for realtors and sellers anywhere in the world. One property per row, up to 200
            per file. Only the <strong>price</strong>, <strong>location</strong> (or a map pin) and{" "}
            <strong>your name</strong> are required.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a href="/listing-template.xlsx" download className={`${big} bg-orange-600 text-white hover:bg-orange-700`}>
          Download Excel template
        </a>
        <a href="/listing-template.csv" download className={`${big} border-2 border-orange-600 bg-white hover:bg-orange-100`}>
          Download CSV template
        </a>
        <Link href="/upload" className={`${big} bg-zinc-900 text-white hover:bg-zinc-700`}>
          Upload your file
        </Link>
      </div>
      <p className="text-sm text-zinc-700">
        <Link href="/listing-format" className="underline">What goes in each column</Link>
        {" · "}
        <a href="/listing-example.csv" download className="underline">Example file with 3 listings</a>
        {" · "}No account needed
      </p>
    </section>
  );
}
