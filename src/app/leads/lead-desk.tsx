"use client";

import Link from "next/link";
import { useState } from "react";
import { telHref, whatsappHref } from "@/lib/developerContact";

type DeskLead = {
  id: number;
  propertyId: number;
  title: string;
  location: string;
  priceLabel: string;
  status: string;
  createdAt: string;
  siteName: string;
  seller: { name: string; phone: string; email: string | null };
  alert: string;
  agents: { id: number; name: string; agency: string; phone: string; unlock: string | null }[];
  unlocks: {
    id: number;
    status: string;
    priceMyr: number;
    reference: string;
    agent: { name: string; agency: string; phone: string };
  }[];
  paidCount: number;
};

function whatsappWithText(phone: string, text: string) {
  return `${whatsappHref(phone)}?text=${encodeURIComponent(text)}`;
}

export default function LeadDesk({ initial }: { initial: DeskLead[] }) {
  const [leads, setLeads] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function markPaid(unlockId: number) {
    setError(null);
    setPendingId(unlockId);
    try {
      const response = await fetch(`/api/leads/unlocks/${unlockId}/paid`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; leadStatus?: string; error?: string }
        | null;
      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "Could not mark this paid.");
        return;
      }
      setLeads((current) =>
        current.map((lead) => {
          if (!lead.unlocks.some((unlock) => unlock.id === unlockId)) return lead;
          const unlocks = lead.unlocks.map((unlock) =>
            unlock.id === unlockId ? { ...unlock, status: "paid" } : unlock,
          );
          return {
            ...lead,
            unlocks,
            paidCount: unlocks.filter((unlock) => unlock.status === "paid").length,
            status: data.leadStatus ?? lead.status,
          };
        }),
      );
    } catch {
      setError("Could not mark this paid.");
    } finally {
      setPendingId(null);
    }
  }

  if (leads.length === 0) {
    return <p>No sellers have asked for a realtor yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <p role="alert">{error}</p> : null}
      {leads.map((lead) => (
        <article key={lead.id} className="flex flex-col gap-4 border p-4">
          <header className="flex flex-col gap-1">
            <p>
              <Link href={`/property/${lead.propertyId}`} className="font-semibold">
                {lead.title}
              </Link>{" "}
              <span className="text-sm text-zinc-600">
                · {lead.siteName} · {lead.location} · {lead.priceLabel} · lead {lead.id} ·{" "}
                {lead.status === "open" ? `${lead.paidCount} of 3 sold` : "closed"}
              </span>
            </p>
            <p className="text-sm">
              Seller: {lead.seller.name} · <a href={telHref(lead.seller.phone)}>{lead.seller.phone}</a>
              {lead.seller.email ? ` · ${lead.seller.email}` : ""}
            </p>
          </header>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Tell the realtors in this town</h2>
            {lead.agents.length === 0 ? (
              <p className="text-sm text-zinc-600">
                No realtors registered here yet. Phone a couple and ask them to register.
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {lead.agents.map((agent) => (
                  <li key={agent.id} className="flex flex-wrap items-center gap-x-3">
                    <span>
                      {agent.name}, {agent.agency}
                    </span>
                    <a href={whatsappWithText(agent.phone, lead.alert)} target="_blank" rel="noreferrer">
                      Send WhatsApp
                    </a>
                    {agent.unlock ? <span className="text-zinc-600">({agent.unlock})</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Transfers</h2>
            {lead.unlocks.length === 0 ? (
              <p className="text-sm text-zinc-600">No realtor has asked for this seller yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {lead.unlocks.map((unlock) => (
                  <li key={unlock.id} className="flex flex-wrap items-center gap-x-3">
                    <span>
                      {unlock.agent.name}, {unlock.agent.agency} · RM {unlock.priceMyr} · ref{" "}
                      <code>{unlock.reference}</code>
                    </span>
                    {unlock.status === "requested" ? (
                      <button
                        type="button"
                        disabled={pendingId === unlock.id}
                        onClick={() => markPaid(unlock.id)}
                        className="border px-3 py-1 font-semibold"
                      >
                        Mark paid
                      </button>
                    ) : (
                      <span className="text-zinc-600">{unlock.status}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </article>
      ))}
    </div>
  );
}
