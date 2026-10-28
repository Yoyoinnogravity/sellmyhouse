import Link from "next/link";

// A slim, high-up call to realtors: the Global Database Format and upload.
export function RealtorStrip() {
  return (
    <section
      aria-label="For realtors"
      className="flex flex-col gap-3 bg-orange-600 p-4 text-white sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-lg font-bold">Realtors: upload your whole stock free</p>
        <p className="text-sm text-orange-50">
          Sales and long-term rentals, up to 200 per file, anywhere in the world. No account, no fees.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
        <a
          href="/listing-template.xlsx"
          download="Global-Database-Format-for-Realtors.xlsx"
          className="inline-flex min-h-[48px] items-center justify-center bg-white px-4 text-center font-semibold text-orange-800 hover:bg-orange-50"
        >
          Download the Global Database Format
        </a>
        <Link
          href="/upload"
          className="inline-flex min-h-[48px] items-center justify-center border-2 border-white px-4 font-semibold hover:bg-orange-700"
        >
          Upload your file
        </Link>
      </div>
    </section>
  );
}
