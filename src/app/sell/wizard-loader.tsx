"use client";

import dynamic from "next/dynamic";

// The guide runs only in the browser, so it can pick up details remembered
// from the last listing without a flash of empty fields.
const ListingWizard = dynamic(() => import("./listing-wizard"), {
  ssr: false,
  loading: () => <p className="mt-6 text-zinc-600">Loading…</p>,
});

export default ListingWizard;
