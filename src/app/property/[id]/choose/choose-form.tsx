"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ChooseAgentForm({
  propertyId,
  agentId,
}: {
  propertyId: number;
  agentId: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/properties/${propertyId}/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? "Could not choose this agent.");
        return;
      }
      router.push(`/property/${propertyId}`);
      router.refresh();
    } catch {
      setError("Could not choose this agent.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Choosing…" : "Choose this agent"}
      </button>
    </form>
  );
}
