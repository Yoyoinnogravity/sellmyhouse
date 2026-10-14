import Link from "next/link";
import AdvertiseForm from "./advertise-form";

const SITES = [
  { host: "sellmyhouse.asia", audience: "House buyers and sellers" },
  { host: "sellmycondo.asia", audience: "Condo and apartment buyers and sellers" },
  { host: "sellmyland.asia", audience: "Land buyers and sellers" },
  { host: "sellmybungalow.asia", audience: "Bungalow buyers and sellers" },
];

const PLACEMENTS = [
  { title: "Homepage banner", detail: "Top of the home page on the sites you choose." },
  { title: "Listing pages", detail: "Beside search results and map listings." },
  { title: "Property pages", detail: "On individual listing pages in your regions." },
];

export default function AdvertisePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Advertise with us</h1>
      <p>
        Put your business in front of people buying and selling property across
        our four sites. No account needed to enquire. To commit, send the form
        below and agree to the advertising terms.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {SITES.map((site) => (
          <li key={site.host} className="flex flex-col gap-1 border p-4">
            <p className="font-semibold">{site.host}</p>
            <p className="text-sm text-zinc-600">{site.audience}</p>
          </li>
        ))}
      </ul>
      <h2 className="text-2xl font-semibold tracking-tight">Ad placements</h2>
      <ul className="grid gap-4 sm:grid-cols-3">
        {PLACEMENTS.map((placement) => (
          <li key={placement.title} className="flex flex-col gap-1 border p-4">
            <p className="font-semibold">{placement.title}</p>
            <p className="text-sm text-zinc-600">{placement.detail}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-zinc-600">
        Pricing depends on the sites, placement, and duration you choose. Tell
        us your budget in the form and we will confirm a quote.
      </p>
      <h2 className="text-2xl font-semibold tracking-tight">Advertising terms</h2>
      <div className="flex flex-col gap-3">
        <p>
          Ads on these sites are served through Google advertising products.
          Committing as an advertiser means you agree to Google&apos;s standard
          terms as well as our site rules:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>
            <Link href="https://business.safety.google/ads-terms/" target="_blank" rel="noreferrer">
              Google Ads Terms and Conditions
            </Link>
            {" "}— the standard agreement between Google and its advertisers.
          </li>
          <li>
            <Link href="https://support.google.com/adspolicy" target="_blank" rel="noreferrer">
              Google Advertising Policies
            </Link>
            {" "}— what ads may and may not contain, including rules on
            misleading claims and restricted content.
          </li>
          <li>
            <Link href="https://support.google.com/adsense/answer/48182" target="_blank" rel="noreferrer">
              AdSense Programme Policies
            </Link>
            {" "}— the standards every page carrying Google ads must meet.
          </li>
          <li>
            <Link href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
              Google Terms of Service
            </Link>
            {" and "}
            <Link href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
              Google Privacy Policy
            </Link>
            .
          </li>
        </ul>
        <p>Our site rules in brief:</p>
        <ul className="flex list-disc flex-col gap-2 pl-6">
          <li>Ads must be lawful and must not mislead about price, availability, or location.</li>
          <li>Property ads must respect fair-housing and non-discrimination law in the country advertised.</li>
          <li>No personal data of buyers or sellers is shared with advertisers.</li>
          <li>We may refuse or remove ads that breach these terms, with a refund for unused time.</li>
        </ul>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">Commit to advertise</h2>
      <AdvertiseForm />
    </main>
  );
}
