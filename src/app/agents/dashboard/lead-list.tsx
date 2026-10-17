"use client";

import Link from "next/link";
import { useState } from "react";
import type { AgentLead } from "@/lib/leads";
import { telHref, whatsappHref } from "@/lib/developerContact";

export default function LeadList({
  initial,
  town,
  bank,
}: {
  initial: AgentLead[];
  town: string;
  bank: string;
}) {
  const [leads, setLeads] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function unlock(id: number) {
    setError(null);
    setPendingId(id);
    try {
      const response = await fetch(`/api/leads/${id}/unlock`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | { lead?: AgentLead; error?: string }
        | null;
      if (!response.ok || !data?.lead) {
        setError(data?.error ?? "Could not request this seller.");
        return;
      }
      setLeads((current) => current.map((lead) => (lead.id === id ? data.lead! : lead)));
    } catch {
      setError("Could not request this seller.");
    } finally {
      setPendingId(null);
    }
  }

  if (leads.length === 0) {
    return <p>No sellers in {town} are asking for a realtor right now.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <p role="alert">{error}</p> : null}
      <ul className="flex flex-col gap-4">
        {leads.map((lead) => (
          <li key={lead.id} className="flex flex-col gap-2 border p-4">
            <p>
              <Link href={`/property/${lead.propertyId}`} className="font-semibold">
                {lead.title}
              </Link>
            </p>
            <p className="text-sm text-zinc-600">
              {lead.siteName} · {lead.location} · {lead.priceLabel} · listed{" "}
              {new Date(lead.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
            </p>

            {lead.state === "available" ? (
              <p className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={pendingId === lead.id}
                  onClick={() => unlock(lead.id)}
                  className="border px-4 py-2 font-semibold"
                >
                  Get the number · RM {lead.priceMyr}
                </button>
                <span className="text-sm text-zinc-600">
                  {lead.slotsLeft} of 3 places left
                </span>
              </p>
            ) : null}

            {lead.state === "requested" ? (
              <div className="flex flex-col gap-1 border-l-4 pl-3">
                <p className="font-semibold">Transfer RM {lead.priceMyr} with reference {lead.reference}</p>
                <p className="text-sm whitespace-pre-line">{bank}</p>
                <p className="text-sm text-zinc-600">
                  The seller&apos;s number appears here once the transfer arrives.
                </p>
              </div>
            ) : null}

            {lead.state === "paid" && lead.seller ? (
              <div className="flex flex-col gap-1 border-l-4 pl-3">
                <p className="font-semibold">{lead.seller.name}</p>
                <p className="flex flex-wrap gap-x-4">
                  <a href={telHref(lead.seller.phone)}>{lead.seller.phone}</a>
                  <a href={whatsappHref(lead.seller.phone)}>WhatsApp</a>
                  {lead.seller.email ? <a href={`mailto:${lead.seller.email}`}>{lead.seller.email}</a> : null}
                </p>
              </div>
            ) : null}

            {lead.state === "taken" ? (
              <p className="text-sm text-zinc-600">Taken. Three realtors already have this seller.</p>
            ) : null}
            {lead.state === "closed" ? (
              <p className="text-sm text-zinc-600">Closed. This seller is no longer looking.</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
