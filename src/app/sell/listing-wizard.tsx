"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { LocationPicker } from "@/components/location-picker";

// The guided way to list: one small step at a time, photos added one by
// one, then publish. "List another property" starts again with the
// person's details remembered (in this browser only), so a realtor can add
// listing after listing without a spreadsheet.

type Defaults = { title: string; price: string; location: string };
type Saved = { realtor: boolean; name: string; phone: string; email: string; agency: string };

const SAVED_KEY = "listing-contact";
const MAX_PHOTOS = 8;
const STEPS = ["Sell or rent", "Photos", "Where", "Price", "Describe it", "Your details", "Check and publish"] as const;

const TYPES = ["House", "Terrace", "Semi-detached", "Bungalow", "Townhouse", "Condominium", "Apartment", "Studio", "Villa", "Land"];

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

export default function ListingWizard({
  defaults,
  asRealtor = false,
  forRent = false,
}: {
  defaults: Defaults;
  noun: string;
  asRealtor?: boolean;
  forRent?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [rent, setRent] = useState(forRent);
  // Details remembered from the last listing made in this browser. This
  // component only renders in the browser (see sell/wizard-loader.tsx).
  const [saved] = useState(readSaved);
  const [realtor, setRealtor] = useState(asRealtor || Boolean(saved?.realtor));
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [location, setLocation] = useState(defaults.location);
  const [contact, setContact] = useState({
    name: saved?.name ?? "",
    phone: saved?.phone ?? "",
    email: saved?.email ?? "",
    agency: saved?.agency ?? "",
  });
  const [price, setPrice] = useState(defaults.price);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const top = useRef<HTMLDivElement>(null);

  function go(next: number) {
    setError(null);
    setStep(next);
    // After the new step has rendered, bring its top into view.
    requestAnimationFrame(() => top.current?.scrollIntoView({ block: "start" }));
  }

  function value(name: string) {
    const field = form.current?.elements.namedItem(name) as HTMLInputElement | null;
    return field?.value?.trim() ?? "";
  }

  // What each step needs before moving on.
  function problem(at: number): string | null {
    if (at === 2 && !location.trim() && !value("lat")) return "Type the town, or tap your property on the map.";
    if (at === 3) {
      const amount = Number(price.replace(/[^0-9]/g, ""));
      if (!Number.isInteger(amount) || amount <= 0) {
        return rent ? "Enter the monthly rent as a number, for example 2500." : "Enter the asking price as a number, for example 450000.";
      }
      const lease = value("minLease");
      if (rent && lease && Number(lease) < 6) return "We list long-term rentals only: a minimum lease of 6 months or more.";
    }
    if (at === 5) {
      if (!contact.name.trim()) return "Please add your name.";
      if (realtor && !contact.phone.trim() && !contact.email.trim()) return "Add a phone number or email so people can reach you.";
    }
    return null;
  }

  function next() {
    const issue = problem(step);
    if (issue) {
      setError(issue);
      return;
    }
    go(step + 1);
  }

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    setError(null);
    setPhotos((current) => {
      const room = MAX_PHOTOS - current.length;
      if (files.length > room) setError(`Up to ${MAX_PHOTOS} photos. The first ${Math.max(room, 0)} were added.`);
      return [...current, ...files.slice(0, Math.max(room, 0)).map((file) => ({ file, url: URL.createObjectURL(file) }))];
    });
  }

  function movePhoto(index: number, by: number) {
    setPhotos((current) => {
      const next = [...current];
      const target = index + by;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter on any earlier step just moves to the next one.
    if (step < STEPS.length - 1) {
      next();
      return;
    }
    for (const at of [2, 3, 5]) {
      const issue = problem(at);
      if (issue) {
        setError(issue);
        setStep(at);
        return;
      }
    }
    const formData = new FormData(event.currentTarget);
    formData.delete("photoPicker");
    for (const photo of photos) formData.append("photos", photo.file);
    formData.set("price", String(Number(price.replace(/[^0-9]/g, ""))));
    formData.set("saleType", rent ? "rent" : "sale");
    formData.set("contactName", contact.name);
    formData.set("contactPhone", contact.phone);
    formData.set("contactEmail", contact.email);
    if (realtor) {
      formData.set("contactType", "specified");
      formData.set("realtorName", contact.name);
      formData.set("realtorPhone", contact.phone);
      formData.set("realtorEmail", contact.email);
      formData.set("realtorAgency", contact.agency);
      formData.delete("agentLeads");
    } else {
      formData.set("contactType", "direct");
    }
    if (rent) formData.delete("agentLeads");
    formData.set("solicitorChoice", "none");

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/properties/publish", { method: "POST", body: formData });
      const data = (await response.json().catch(() => null)) as { id?: number; manageKey?: string; error?: string } | null;
      if (!response.ok || !data?.id) {
        setError(data?.error ?? "Your listing couldn't be published just now. Please try again in a minute.");
        return;
      }
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify({ realtor, ...contact }));
      } catch {
        // Not remembered; nothing else is affected.
      }
      // A full page load, so the #key reaches the listing page intact.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/property/${data.id}?published=1${data.manageKey ? `#key=${data.manageKey}` : ""}`);
    } catch {
      setError("Your listing couldn't be published just now. Please try again in a minute.");
    } finally {
      setPending(false);
    }
  }

  const input = "mt-1 block w-full border px-3 py-3 text-base";
  const big = "min-h-[52px] px-6 text-lg font-semibold";
  const choice = (on: boolean) =>
    `flex min-h-[72px] flex-col items-start justify-center border-2 px-4 py-2 text-left ${on ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white"}`;
  const show = (at: number) => (step === at ? "flex flex-col gap-4" : "hidden");
  const heading = "text-xl font-semibold";

  return (
    <div ref={top} className="mt-6 flex scroll-mt-24 flex-col gap-5">
      {/* Progress */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-600">
          Step {step + 1} of {STEPS.length}: <strong className="text-zinc-900">{STEPS[step]}</strong>
        </p>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }} aria-hidden="true">
          {STEPS.map((label, index) => (
            <span key={label} className={`h-2 ${index <= step ? "bg-zinc-900" : "bg-zinc-200"}`} />
          ))}
        </div>
      </div>

      <form ref={form} onSubmit={publish} className="flex flex-col gap-6" noValidate>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1 }} />

        {/* 1. Sell or rent */}
        <section className={show(0)}>
          <h2 className={heading}>Are you selling or renting out?</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={!rent} onClick={() => setRent(false)} className={choice(!rent)}>
              <span className="text-lg font-semibold">Sell</span>
              <span className="text-sm opacity-80">Find a buyer</span>
            </button>
            <button type="button" aria-pressed={rent} onClick={() => setRent(true)} className={choice(rent)}>
              <span className="text-lg font-semibold">Rent out</span>
              <span className="text-sm opacity-80">Long-term, 6 months+</span>
            </button>
          </div>
          <h2 className={heading}>Who&apos;s listing?</h2>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={!realtor} onClick={() => setRealtor(false)} className={choice(!realtor)}>
              <span className="text-lg font-semibold">I&apos;m the owner</span>
              <span className="text-sm opacity-80">My own property</span>
            </button>
            <button type="button" aria-pressed={realtor} onClick={() => setRealtor(true)} className={choice(realtor)}>
              <span className="text-lg font-semibold">I&apos;m a realtor</span>
              <span className="text-sm opacity-80">Listing for a client</span>
            </button>
          </div>
        </section>

        {/* 2. Photos, one at a time */}
        <section className={show(1)}>
          <h2 className={heading}>Add your photos</h2>
          <p className="text-zinc-600">
            Start with the best one: it&apos;s the first thing people see. Add up to {MAX_PHOTOS}, one at a time.
          </p>
          {photos.length > 0 ? (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <li key={photo.url} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Photo ${index + 1}`} className="aspect-[4/3] w-full border object-cover" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{index === 0 ? "Main photo" : `Photo ${index + 1}`}</span>
                    <span className="flex gap-1">
                      {index > 0 ? (
                        <button type="button" onClick={() => movePhoto(index, -1)} className="min-h-[36px] border px-2" aria-label="Move earlier">←</button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setPhotos((current) => current.filter((_, at) => at !== index))}
                        className="min-h-[36px] border px-2"
                      >
                        Remove
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
          {photos.length < MAX_PHOTOS ? (
            <label
              htmlFor="photoPicker"
              className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed border-zinc-400 p-6 text-center hover:border-zinc-800"
            >
              <span className="text-lg font-semibold">
                {photos.length === 0 ? "Tap to add your first photo" : "Tap to add the next photo"}
              </span>
              <span className="text-sm text-zinc-600">
                {photos.length} of {MAX_PHOTOS} added · from your phone&apos;s camera or gallery
              </span>
              <input id="photoPicker" name="photoPicker" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} className="sr-only" />
            </label>
          ) : null}
          <p className="text-sm text-zinc-600">
            {photos.length === 0
              ? "No photos to hand? Skip this step; you can add them later with your private link."
              : "Happy with these? Tap Next. The ← button moves a photo earlier."}
          </p>
        </section>

        {/* 3. Where */}
        <section className={show(2)}>
          <h2 className={heading}>Where is it?</h2>
          <label htmlFor="location">
            Town or area
            <input id="location" name="location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Ipoh, Perak, Malaysia" className={input} />
          </label>
          <div className="flex flex-col gap-1">
            <span>Tap your property on the map, or use your current location</span>
            <LocationPicker location={location} onPlace={(place) => setLocation((current) => (current.trim() ? current : place))} />
          </div>
        </section>

        {/* 4. Price */}
        <section className={show(3)}>
          <h2 className={heading}>{rent ? "What's the monthly rent?" : "What's the asking price?"}</h2>
          <label htmlFor="price">
            {rent ? "Rent per month" : "Asking price"}
            <input
              id="price"
              name="price"
              inputMode="numeric"
              placeholder={rent ? "2500" : "450000"}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={`${input} text-2xl`}
            />
          </label>
          {rent ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label htmlFor="deposit">
                Deposit <span className="text-zinc-500">(optional)</span>
                <input id="deposit" name="deposit" inputMode="numeric" className={input} />
              </label>
              <label htmlFor="minLease">
                Minimum lease in months <span className="text-zinc-500">(6 or more)</span>
                <input id="minLease" name="minLease" type="number" min={6} max={120} placeholder="12" className={input} />
              </label>
              <label htmlFor="availableFrom">
                Available from <span className="text-zinc-500">(optional)</span>
                <input id="availableFrom" name="availableFrom" type="date" className={input} />
              </label>
              <label htmlFor="furnished">
                Furnished? <span className="text-zinc-500">(optional)</span>
                <select id="furnished" name="furnished" defaultValue="" className={input}>
                  <option value="">Not saying</option>
                  <option>Furnished</option>
                  <option>Partly furnished</option>
                  <option>Unfurnished</option>
                </select>
              </label>
            </div>
          ) : null}
          <p className="text-sm text-zinc-600">The currency is worked out from the location. Numbers only, e.g. 450000.</p>
        </section>

        {/* 5. Describe it */}
        <section className={show(4)}>
          <h2 className={heading}>Describe it</h2>
          <p className="text-zinc-600">All optional, but listings with details get more calls.</p>
          <label htmlFor="propertyType">
            What kind of property?
            <select id="propertyType" name="propertyType" defaultValue="" className={input}>
              <option value="">Choose…</option>
              {TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label htmlFor="bedrooms">
              Bedrooms
              <input id="bedrooms" name="bedrooms" type="number" min={0} max={30} className={input} />
            </label>
            <label htmlFor="bathrooms">
              Bathrooms
              <input id="bathrooms" name="bathrooms" type="number" min={0} max={30} className={input} />
            </label>
            <label htmlFor="builtUp">
              Floor area
              <input id="builtUp" name="builtUp" inputMode="numeric" placeholder="1200" className={input} />
            </label>
            <label htmlFor="areaUnit">
              Unit
              <select id="areaUnit" name="areaUnit" defaultValue="sq ft" className={input}>
                <option>sq ft</option>
                <option>sq m</option>
              </select>
            </label>
          </div>
          {!rent ? (
            <label htmlFor="tenure">
              Tenure
              <select id="tenure" name="tenure" defaultValue="" className={input}>
                <option value="">Not sure / skip</option>
                <option>Freehold</option>
                <option>Leasehold</option>
              </select>
            </label>
          ) : null}
          <label htmlFor="title">
            A short headline <span className="text-zinc-500">(we&apos;ll write one if you skip it)</span>
            <input id="title" name="title" maxLength={120} defaultValue={defaults.title} placeholder="e.g. Corner terrace near schools" className={input} />
          </label>
          <label htmlFor="description">
            Tell people about it
            <textarea id="description" name="description" rows={5} placeholder="Quiet street, renovated kitchen, 5 minutes to the LRT…" className={input} />
          </label>
        </section>

        {/* 6. Your details */}
        <section className={show(5)}>
          <h2 className={heading}>How can people reach you?</h2>
          <label htmlFor="contactNameInput">
            {realtor ? "Your name (realtor)" : "Your name"}
            <input id="contactNameInput" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} autoComplete="name" className={input} />
          </label>
          <label htmlFor="contactPhoneInput">
            Phone or WhatsApp <span className="text-zinc-500">(most people call)</span>
            <input id="contactPhoneInput" type="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} autoComplete="tel" placeholder="+60 12 345 6789" className={input} />
          </label>
          <label htmlFor="contactEmailInput">
            Email <span className="text-zinc-500">(optional)</span>
            <input id="contactEmailInput" type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} autoComplete="email" className={input} />
          </label>
          {realtor ? (
            <label htmlFor="agencyInput">
              Agency <span className="text-zinc-500">(optional)</span>
              <input id="agencyInput" value={contact.agency} onChange={(event) => setContact({ ...contact, agency: event.target.value })} autoComplete="organization" className={input} />
            </label>
          ) : null}
          {!realtor && !rent ? (
            <label className="flex items-start gap-3 border p-3">
              <input type="checkbox" name="agentLeads" value="1" className="mt-1 h-5 w-5" />
              <span>
                Also let local realtors offer to help me sell.
                <span className="block text-sm text-zinc-600">Optional and free. Your number isn&apos;t shown publicly for this.</span>
              </span>
            </label>
          ) : null}
        </section>

        {/* 7. Check and publish */}
        <section className={show(6)}>
          <h2 className={heading}>Check and publish</h2>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 border p-4 text-sm">
            <dt className="text-zinc-600">Listing</dt>
            <dd>{rent ? "For rent (long-term)" : "For sale"} · {realtor ? "by a realtor" : "by the owner"}</dd>
            <dt className="text-zinc-600">Photos</dt>
            <dd>{photos.length === 0 ? "None yet" : `${photos.length} added`}</dd>
            <dt className="text-zinc-600">Where</dt>
            <dd>{location || "Pinned on the map"}</dd>
            <dt className="text-zinc-600">{rent ? "Rent" : "Price"}</dt>
            <dd>{price ? `${Number(price.replace(/[^0-9]/g, "")).toLocaleString()}${rent ? " a month" : ""}` : "—"}</dd>
            <dt className="text-zinc-600">Contact</dt>
            <dd>{[contact.name, contact.phone, contact.email].filter(Boolean).join(" · ")}</dd>
          </dl>
          <p className="text-sm text-zinc-600">
            Free, no account. You&apos;ll get a private link to check or edit your listing, and a sign to print.
          </p>
          <button type="submit" disabled={pending} className={`${big} bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-60`}>
            {pending ? "Publishing…" : rent ? "Publish my rental" : "Publish my listing"}
          </button>
        </section>

        {error ? (
          <p role="alert" className="border border-red-300 bg-red-50 p-3 text-red-800">
            {error}
          </p>
        ) : null}

        {/* Back / Next */}
        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => go(step - 1)} className={`${big} border-2 border-zinc-900`}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className={`${big} bg-zinc-900 text-white hover:bg-zinc-700`}>
              {step === 1 && photos.length === 0 ? "Skip photos" : "Next"}
            </button>
          ) : null}
        </div>
      </form>

      <p className="text-sm text-zinc-600">
        Lots of properties? <a href="/upload" className="underline">Upload a spreadsheet instead</a>.
      </p>
    </div>
  );
}
