import Link from "next/link";
import { currentSite } from "@/lib/site";

export default async function PrivacyPage() {
  const site = await currentSite();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
      <p className="text-sm text-zinc-600">Last updated October 2026.</p>
      <p>
        {site.name} is a free property marketplace. Buying needs no account.
        This policy explains what personal data we collect when you sell,
        register as an agent, or contact us, and what we do with it.
      </p>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Data we collect</h2>
        <ul className="list-disc pl-6">
          <li>
            Seller listings: property details, photos, and the contact details
            you choose to display.
          </li>
          <li>
            Realtor registration: name, contact details, and region.
          </li>
          <li>
            Account credentials: email and password, if you create an account
            to sell or represent.
          </li>
          <li>
            Messages you send us, for example through the advertise form.
          </li>
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">How we use it</h2>
        <ul className="list-disc pl-6">
          <li>To publish and display listings, including photos.</li>
          <li>To let buyers contact sellers, agents, and conveyancers.</li>
          <li>To operate accounts and respond to enquiries.</li>
        </ul>
        <p>
          We do not sell personal data. We show paid advertising placements,
          but we do not build behavioural profiles for advertisers.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Your choices</h2>
        <p>
          Contact us to correct or remove your listing, photos, or account
          data. Removing a listing removes its photos from public view.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Data and the law</h2>
        <p>
          We handle personal data in line with Malaysia&apos;s Personal Data
          Protection Act 2010. Data is stored securely and kept only as long
          as needed to run the marketplace.
        </p>
      </section>
      <p>
        <Link href="/">Back to {site.name}</Link>
      </p>
    </main>
  );
}
