"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { SolicitorContacts } from "@/components/solicitor-contacts";

type SolicitorOption = {
  id: number;
  name: string;
  firm: string;
  phone: string;
  email: string;
  country: string;
  city: string | null;
};

type AgentOption = {
  id: number;
  name: string;
  agency: string;
  country: string;
  city: string | null;
};

type ListingDraft = {
  title: string;
  price: string;
  location: string;
};

type SolicitorChoice = "none" | "later" | "now";

export default function PublishForm({
  draft,
  solicitors,
  agents,
}: {
  draft: ListingDraft;
  solicitors: SolicitorOption[];
  agents: AgentOption[];
}) {
  const [solicitorChoice, setSolicitorChoice] = useState<SolicitorChoice>("none");
  const [selectedSolicitor, setSelectedSolicitor] =
    useState<SolicitorOption | null>(null);
  const [contactType, setContactType] = useState<"direct" | "agent">("direct");
  const [agentId, setAgentId] = useState(agents[0] ? String(agents[0].id) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const details = new URLSearchParams({
    title: draft.title,
    price: draft.price,
    location: draft.location,
  });

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (solicitorChoice === "now" && !selectedSolicitor) {
      setError("Choose a conveyancer.");
      return;
    }

    setPending(true);
    const formData = new FormData(event.currentTarget);
    let solicitorId: number | null = null;
    if (solicitorChoice === "now" && selectedSolicitor) {
      solicitorId = selectedSolicitor.id;
    }

    const body =
      contactType === "direct"
        ? {
            title: draft.title,
            price: Number(draft.price),
            location: draft.location,
            contactType,
            contactName: String(formData.get("contactName") ?? ""),
            contactPhone: String(formData.get("contactPhone") ?? ""),
            contactEmail: String(formData.get("contactEmail") ?? ""),
            solicitorId,
          }
        : {
            title: draft.title,
            price: Number(draft.price),
            location: draft.location,
            contactType,
            agentId: Number(agentId),
            solicitorId,
          };

    try {
      const response = await fetch("/api/properties/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as {
        id?: number;
        error?: string;
      } | null;

      if (!response.ok || !data?.id) {
        setError(data?.error ?? "Could not publish this listing.");
        return;
      }

      window.location.assign(`/property/${data.id}`);
    } catch {
      setError("Could not publish this listing.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={publish} className="mt-8 flex flex-col gap-4">
      <p>
        {draft.title} in {draft.location}
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend>How do you want to handle the sale?</legend>
        <label>
          <input
            type="radio"
            name="solicitorChoice"
            value="none"
            checked={solicitorChoice === "none"}
            onChange={() => {
              setSolicitorChoice("none");
              setSelectedSolicitor(null);
            }}
          />{" "}
          List it without a conveyancer
        </label>
        <label>
          <input
            type="radio"
            name="solicitorChoice"
            value="later"
            checked={solicitorChoice === "later"}
            onChange={() => {
              setSolicitorChoice("later");
              setSelectedSolicitor(null);
            }}
          />{" "}
          Choose a conveyancer later
        </label>
        <label>
          <input
            type="radio"
            name="solicitorChoice"
            value="now"
            checked={solicitorChoice === "now"}
            onChange={() => setSolicitorChoice("now")}
          />{" "}
          Choose a conveyancer now
        </label>
      </fieldset>

      {solicitorChoice === "now" ? (
        <section className="flex flex-col gap-4">
          <h2>Local conveyancers</h2>
          {solicitors.length === 0 ? (
            <p>No local conveyancers listed for this area yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {solicitors.map((solicitor) => (
                <li key={solicitor.id}>
                  <label>
                    <input
                      type="radio"
                      name="solicitorId"
                      value={solicitor.id}
                      checked={selectedSolicitor?.id === solicitor.id}
                      onChange={() => setSelectedSolicitor(solicitor)}
                    />{" "}
                    <Link href={`/solicitors/${solicitor.id}`}>
                      {solicitor.name}
                    </Link>
                  </label>
                  {solicitor.firm !== solicitor.name ? <p>{solicitor.firm}</p> : null}
                  <p>
                    {[solicitor.city, solicitor.country].filter(Boolean).join(", ")}
                  </p>
                  <SolicitorContacts phone={solicitor.phone} email={solicitor.email} />
                </li>
              ))}
            </ul>
          )}
          <p>
            <Link href="/solicitors">Browse all conveyancers</Link>
          </p>
        </section>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend>How should buyers reach you?</legend>
        <label>
          <input
            type="radio"
            name="contactType"
            value="direct"
            checked={contactType === "direct"}
            onChange={() => setContactType("direct")}
          />{" "}
          Direct contact
        </label>
        <label>
          <input
            type="radio"
            name="contactType"
            value="agent"
            checked={contactType === "agent"}
            onChange={() => setContactType("agent")}
          />{" "}
          Local estate agent
        </label>
      </fieldset>

      {contactType === "direct" ? (
        <>
          <label htmlFor="contactName">
            Name
            <input
              id="contactName"
              name="contactName"
              required
              className="mt-1 block w-full border px-3 py-2"
            />
          </label>
          <label htmlFor="contactPhone">
            Phone
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              required
              className="mt-1 block w-full border px-3 py-2"
            />
          </label>
          <label htmlFor="contactEmail">
            Email
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              required
              className="mt-1 block w-full border px-3 py-2"
            />
          </label>
        </>
      ) : (
        <label htmlFor="agentId">
          Estate agent
          <select
            id="agentId"
            name="agentId"
            required
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            className="mt-1 block w-full border px-3 py-2"
          >
            {agents.length === 0 ? (
              <option value="">No estate agents available</option>
            ) : (
              agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}, {agent.agency} ({agent.city || agent.country})
                </option>
              ))
            )}
          </select>
        </label>
      )}
      {contactType === "agent" ? (
        <p>
          <Link href="/agents">Browse the agent directory</Link>
        </p>
      ) : null}

      {error ? <p role="alert">{error}</p> : null}
      <div className="flex gap-4">
        <Link href={`/sell?${details.toString()}`}>Back</Link>
        <button
          type="submit"
          disabled={
            pending ||
            (solicitorChoice === "now" && !selectedSolicitor) ||
            (contactType === "agent" && !agentId)
          }
        >
          {pending ? "Publishing…" : "Publish"}
        </button>
      </div>
    </form>
  );
}
