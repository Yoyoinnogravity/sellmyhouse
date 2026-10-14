"use client";

import { useState } from "react";

type Claim = {
  id: number;
  company: string;
  contactEmail: string | null;
  contactPhone: string | null;
  listingIds: string;
  status: string;
  createdAt: string;
  user: { email: string };
};

function listingCount(raw: string) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export default function ClaimsQueue({ initial }: { initial: Claim[] }) {
  const [claims, setClaims] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function decide(id: number, approve: boolean) {
    setError(null);
    setPendingId(id);
    try {
      const response = await fetch(`/api/developer-claims/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "Could not record the decision.");
        return;
      }
      setClaims((current) => current.filter((claim) => claim.id !== id));
    } catch {
      setError("Could not record the decision.");
    } finally {
      setPendingId(null);
    }
  }

  if (claims.length === 0) {
    return <p>No pending requests. Developers who ask for edit access will appear here.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <p role="alert">{error}</p> : null}
      <ul className="flex flex-col gap-4">
        {claims.map((claim) => (
          <li key={claim.id} className="flex flex-col gap-2 border p-4">
            <p>
              <strong>{claim.company}</strong> — {listingCount(claim.listingIds)} listing(s)
            </p>
            <p className="text-sm text-zinc-600">
              Requested by {claim.user.email}
              {claim.contactEmail ? ` · ${claim.contactEmail}` : ""}
              {claim.contactPhone ? ` · ${claim.contactPhone}` : ""}
            </p>
            <p className="flex gap-2">
              <button
                type="button"
                disabled={pendingId === claim.id}
                onClick={() => decide(claim.id, true)}
                className="border px-4 py-2 font-semibold"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={pendingId === claim.id}
                onClick={() => decide(claim.id, false)}
                className="border px-4 py-2"
              >
                Reject
              </button>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
