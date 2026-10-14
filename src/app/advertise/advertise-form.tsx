"use client";

import { FormEvent, useState } from "react";

const SITE_OPTIONS = [
  "sellmyhouse.asia",
  "sellmycondo.asia",
  "sellmyland.asia",
  "sellmybungalow.asia",
];

const PLACEMENT_OPTIONS = ["Homepage banner", "Listing pages", "Property pages"];

const DURATION_OPTIONS = ["1 month", "3 months", "6 months", "12 months"];

export default function AdvertiseForm() {
  const [sites, setSites] = useState<string[]>(["sellmyhouse.asia"]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  function toggleSite(host: string) {
    setSites((current) =>
      current.includes(host) ? current.filter((site) => site !== host) : [...current, host],
    );
  }

  async function commit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setReference(null);

    if (sites.length === 0) {
      setError("Choose at least one site.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    if (!formData.get("agree")) {
      setError("Agree to the Google Ads Terms and the site rules to commit.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/advertise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          company: formData.get("company"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          sites,
          placement: formData.get("placement"),
          duration: formData.get("duration"),
          budget: formData.get("budget"),
          message: formData.get("message"),
          agree: true,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        reference?: string;
        error?: string;
      } | null;

      if (!response.ok || !data?.reference) {
        setError(data?.error ?? "Could not record this commitment.");
        return;
      }
      setReference(data.reference);
      event.currentTarget.reset();
      setSites(["sellmyhouse.asia"]);
    } catch {
      setError("Could not record this commitment.");
    } finally {
      setPending(false);
    }
  }

  if (reference) {
    return (
      <p>
        Commitment recorded. Your reference is <strong>{reference}</strong>. We
        will confirm your quote by email.
      </p>
    );
  }

  return (
    <form onSubmit={commit} className="flex max-w-xl flex-col gap-4">
      <label htmlFor="name">
        Name
        <input id="name" name="name" required autoComplete="name" className="mt-1 block w-full border px-3 py-2" />
      </label>
      <label htmlFor="company">
        Company
        <input id="company" name="company" required autoComplete="organization" className="mt-1 block w-full border px-3 py-2" />
      </label>
      <label htmlFor="email">
        Email
        <input id="email" name="email" type="email" required autoComplete="email" className="mt-1 block w-full border px-3 py-2" />
      </label>
      <label htmlFor="phone">
        Phone
        <input id="phone" name="phone" type="tel" required autoComplete="tel" className="mt-1 block w-full border px-3 py-2" />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend>Sites</legend>
        {SITE_OPTIONS.map((host) => (
          <label key={host} className="flex min-h-[44px] items-center gap-2">
            <input
              type="checkbox"
              checked={sites.includes(host)}
              onChange={() => toggleSite(host)}
              className="h-5 w-5"
            />{" "}
            {host}
          </label>
        ))}
      </fieldset>
      <label htmlFor="placement">
        Placement
        <select id="placement" name="placement" required defaultValue={PLACEMENT_OPTIONS[0]} className="mt-1 block w-full border px-3 py-2">
          {PLACEMENT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="duration">
        Duration
        <select id="duration" name="duration" required defaultValue={DURATION_OPTIONS[0]} className="mt-1 block w-full border px-3 py-2">
          {DURATION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="budget">
        Budget (optional)
        <input id="budget" name="budget" placeholder="e.g. MYR 2,000" className="mt-1 block w-full border px-3 py-2" />
      </label>
      <label htmlFor="message">
        Message (optional)
        <textarea id="message" name="message" rows={4} maxLength={2000} className="mt-1 block w-full border px-3 py-2" />
      </label>
      <label className="flex min-h-[44px] items-start gap-2">
        <input type="checkbox" name="agree" value="yes" required className="mt-1 h-5 w-5" />{" "}
        <span>
          I agree to the Google Ads Terms and Conditions and the site
          advertising rules above.
        </span>
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={pending} className="min-h-[44px] border px-4 py-2">
        {pending ? "Recording…" : "Commit to advertise"}
      </button>
    </form>
  );
}
