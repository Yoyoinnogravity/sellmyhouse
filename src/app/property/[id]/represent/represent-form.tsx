"use client";

import { FormEvent, useState } from "react";

export function RepresentForm({ propertyId }: { propertyId: number }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/properties/${propertyId}/represent`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? "Could not send the request.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not send the request.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return <p>Your request to represent the seller has been sent.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Request representation"}
      </button>
    </form>
  );
}
