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
          Add listings one by one with our step-by-step guide, or upload a spreadsheet of up to 200. Sales and
          long-term rentals, anywhere. No account, no fees.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
        <Link
          href="/sell?as=realtor"
          className="inline-flex min-h-[48px] items-center justify-center bg-white px-4 text-center font-semibold text-orange-800 hover:bg-orange-50"
        >
          Add a listing, step by step
        </Link>
        <Link
          href="/listing-format"
          className="inline-flex min-h-[48px] items-center justify-center border-2 border-white px-4 font-semibold hover:bg-orange-700"
        >
          Upload a spreadsheet
        </Link>
      </div>
    </section>
  );
}
