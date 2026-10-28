"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { LocationPicker } from "@/components/location-picker";

type Defaults = { title: string; price: string; location: string };

const examples: Record<string, string> = {
  house: "3-bedroom house with garden",
  condo: "2-bedroom condo with pool view",
  bungalow: "Single-storey bungalow with garden",
  land: "Half-acre plot with road access",
};

// The one-page way to list: photos first, a few details, publish.
// No account. Realtor and conveyancer choices live on the longer form.
export default function QuickSellForm({
  defaults,
  noun,
  asRealtor = false,
}: {
  defaults: Defaults;
  noun: string;
  asRealtor?: boolean;
}) {
  const [realtor, setRealtor] = useState(asRealtor);
  const [previews, setPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState(defaults.location);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (files.length > 8) {
      setError("Please choose up to 8 photos.");
      event.target.value = "";
      setPreviews([]);
      return;
    }
    setError(null);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    if (!String(formData.get("location") ?? "").trim() && !formData.get("lat")) {
      setError("Please type the town or tap your property on the map.");
      return;
    }
    const price = Number(String(formData.get("price") ?? "").replace(/[^0-9]/g, ""));
    if (!Number.isInteger(price) || price <= 0) {
      setError("Please enter the asking price as a number, for example 450000.");
      return;
    }
    formData.set("price", String(price));
    if (realtor) {
      // A realtor listing for a client: buyers contact the realtor.
      formData.set("contactType", "specified");
      formData.set("realtorName", String(formData.get("contactName") ?? ""));
      formData.set("realtorPhone", String(formData.get("contactPhone") ?? ""));
      formData.set("realtorEmail", String(formData.get("contactEmail") ?? ""));
      formData.delete("agentLeads");
    } else {
      formData.set("contactType", "direct");
    }
    formData.set("solicitorChoice", "none");

    setPending(true);
    try {
      const response = await fetch("/api/properties/publish", { method: "POST", body: formData });
      const data = (await response.json().catch(() => null)) as { id?: number; manageKey?: string; error?: string } | null;
      if (!response.ok || !data?.id) {
        setError(data?.error ?? "Your listing couldn't be published just now. Please try again in a minute.");
        return;
      }
      // The manage key goes in the #fragment, which browsers never send to a server.
      window.location.assign(`/property/${data.id}?published=1${data.manageKey ? `#key=${data.manageKey}` : ""}`);
    } catch {
      setError("Your listing couldn't be published just now. Please try again in a minute.");
    } finally {
      setPending(false);
    }
  }

  const input = "mt-1 block w-full border px-3 py-3 text-base";
  const town = location.split(",")[0]?.trim() || "your area";

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-6">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-10000px", width: 1, height: 1 }}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-semibold">Who&apos;s listing?</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: false, label: "I'm the owner", hint: "Selling my own property" },
            { value: true, label: "I'm a realtor", hint: "Listing for a client" },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={realtor === option.value}
              onClick={() => setRealtor(option.value)}
              className={`flex min-h-[64px] flex-col items-start justify-center border-2 px-3 py-2 text-left ${
                realtor === option.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white"
              }`}
            >
              <span className="font-semibold">{option.label}</span>
              <span className={`text-sm ${realtor === option.value ? "text-zinc-200" : "text-zinc-600"}`}>{option.hint}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-zinc-600">
          Several properties? <a href="/upload" className="underline">Upload a spreadsheet instead</a>.
        </p>
      </fieldset>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">1. Add your photos</h2>
        <label
          htmlFor="photos"
          className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed border-zinc-300 p-6 text-center hover:border-zinc-500"
        >
          <span className="font-semibold">Tap to choose photos</span>
          <span className="text-sm text-zinc-600">Up to 8 pictures from your phone or computer. JPG, PNG or WebP.</span>
          <input
            id="photos"
            name="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onPhotos}
            className="sr-only"
          />
        </label>
        {previews.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {previews.map((src, index) => (
              <li key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Photo ${index + 1}`} className="aspect-square w-full border object-cover" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600">No photos to hand? You can still publish without them.</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">2. Tell buyers about it</h2>
        <p className="text-sm text-zinc-600">Only the price and where it is are needed. Everything else is up to you.</p>
        <label htmlFor="title">
          What are you selling? <span className="text-zinc-500">(optional)</span>
          <input
            id="title"
            name="title"
            maxLength={120}
            defaultValue={defaults.title}
            placeholder={examples[noun] ?? `3-bedroom ${noun} with garden`}
            className={input}
          />
        </label>
        <label htmlFor="price">
          Asking price
          <input
            id="price"
            name="price"
            inputMode="numeric"
            required
            defaultValue={defaults.price}
            placeholder="450000"
            className={input}
          />
        </label>
        <label htmlFor="location">
          Where is it? <span className="text-zinc-500">(type the town, or just drop a pin below)</span>
          <input
            id="location"
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Town, country"
            className={input}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span>
            Pin it on the map <span className="text-zinc-500">(helps buyers find it)</span>
          </span>
          <LocationPicker
            location={location}
            onPlace={(place) => setLocation((current) => (current.trim() ? current : place))}
          />
        </div>
        <label htmlFor="description">
          A few words about it <span className="text-zinc-500">(optional)</span>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Quiet street, near schools, recently renovated kitchen…"
            className={input}
          />
        </label>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">3. How can buyers reach you?</h2>
        <p className="text-sm text-zinc-600">Your name is needed. Add a phone number or email so buyers can reach you.</p>
        <label htmlFor="contactName">
          {realtor ? "Your name (realtor)" : "Your name"}
          <input id="contactName" name="contactName" required autoComplete="name" className={input} />
        </label>
        <label htmlFor="contactPhone">
          Phone or WhatsApp <span className="text-zinc-500">(optional, but buyers call most)</span>
          <input id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" className={input} />
        </label>
        <label htmlFor="contactEmail">
          Email <span className="text-zinc-500">(optional)</span>
          <input id="contactEmail" name="contactEmail" type="email" autoComplete="email" className={input} />
        </label>
        {realtor ? (
          <label htmlFor="realtorAgency">
            Agency <span className="text-zinc-500">(optional)</span>
            <input id="realtorAgency" name="realtorAgency" maxLength={120} autoComplete="organization" className={input} />
          </label>
        ) : null}
        <label className={`flex items-start gap-3 border p-3 ${realtor ? "hidden" : ""}`}>
          <input type="checkbox" name="agentLeads" value="1" className="mt-1 h-5 w-5" disabled={realtor} />
          <span>
            Also let realtors in {town} offer to help me sell.
            <span className="block text-sm text-zinc-600">
              Optional and free. Your number isn&apos;t shown publicly for this; up to three local realtors can ask us for it.
            </span>
          </span>
        </label>
      </section>

      {error ? (
        <p role="alert" className="border border-red-300 bg-red-50 p-3 text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-[52px] bg-zinc-900 px-6 text-lg font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Publish my listing free"}
      </button>
      <p className="text-sm text-zinc-600">
        No account and no fees. Your listing goes on the world map within a few minutes.
      </p>
    </form>
  );
}
