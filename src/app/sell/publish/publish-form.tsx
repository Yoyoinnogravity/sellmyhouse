"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { SolicitorContacts } from "@/components/solicitor-contacts";
import { propertyRegion } from "@/lib/region";

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

type SolicitorChoice = "none" | "later" | "now" | "specify";
type ContactChoice = "direct" | "agent" | "specified";

export default function PublishForm({
  draft,
  solicitors,
  agents,
  agentRegisterHref,
  conveyancerRegisterHref,
}: {
  draft: ListingDraft;
  solicitors: SolicitorOption[];
  agents: AgentOption[];
  agentRegisterHref: string;
  conveyancerRegisterHref: string;
}) {
  const [solicitorChoice, setSolicitorChoice] = useState<SolicitorChoice>("none");
  const [selectedSolicitor, setSelectedSolicitor] =
    useState<SolicitorOption | null>(null);
  const [contactType, setContactType] = useState<ContactChoice>("direct");
  const [agentId, setAgentId] = useState(agents[0] ? String(agents[0].id) : "");
  const [previews, setPreviews] = useState<string[]>([]);
  const [agentLeads, setAgentLeads] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const leadTown = propertyRegion(draft.location)?.city ?? draft.location;

  const details = new URLSearchParams({
    title: draft.title,
    price: draft.price,
    location: draft.location,
  });

  function onPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    if (files.length > 8) {
      setError("Add up to 8 pictures.");
      event.target.value = "";
      setPreviews([]);
      return;
    }
    setError(null);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (solicitorChoice === "now" && !selectedSolicitor) {
      setError("Choose a solicitor.");
      return;
    }

    setPending(true);
    const formData = new FormData(event.currentTarget);
    formData.set("title", draft.title);
    formData.set("price", draft.price);
    formData.set("location", draft.location);
    formData.set("contactType", contactType);
    formData.set("solicitorChoice", solicitorChoice);
    if (solicitorChoice === "now" && selectedSolicitor) {
      formData.set("solicitorId", String(selectedSolicitor.id));
    }
    if (contactType === "agent") formData.set("agentId", agentId);
    if (contactType !== "direct") formData.delete("agentLeads");

    try {
      const response = await fetch("/api/properties/publish", {
        method: "POST",
        body: formData,
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
      <label htmlFor="description">
        Description
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={2000}
          className="mt-1 block w-full border px-3 py-2"
        />
      </label>
      <label htmlFor="photos">
        Pictures
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={onPhotos}
          className="mt-1 block w-full"
        />
      </label>
      <p>JPG, PNG, or WebP. Up to 8 pictures.</p>
      {previews.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {previews.map((src) => (
            <li key={src}>
              <img src={src} alt="" className="aspect-square w-full object-cover" />
            </li>
          ))}
        </ul>
      ) : null}
      <fieldset className="flex flex-col gap-2">
        <legend>Solicitor</legend>
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
          No solicitor on this listing
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
          Choose a solicitor later
        </label>
        <label>
          <input
            type="radio"
            name="solicitorChoice"
            value="now"
            checked={solicitorChoice === "now"}
            onChange={() => setSolicitorChoice("now")}
          />{" "}
          Choose a solicitor
        </label>
        <label>
          <input
            type="radio"
            name="solicitorChoice"
            value="specify"
            checked={solicitorChoice === "specify"}
            onChange={() => {
              setSolicitorChoice("specify");
              setSelectedSolicitor(null);
            }}
          />{" "}
          Specify a solicitor
        </label>
      </fieldset>

      {solicitorChoice === "now" ? (
        <section className="flex flex-col gap-4">
          <h2>Local conveyancers</h2>
          {solicitors.length === 0 ? (
            <p>
              No conveyancers registered for this region.{" "}
              <Link href={conveyancerRegisterHref}>Add your details and region</Link>
            </p>
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

      {solicitorChoice === "specify" ? (
        <>
          <label htmlFor="solicitorName">
            Solicitor name
            <input id="solicitorName" name="solicitorName" required className="mt-1 block w-full border px-3 py-2" />
          </label>
          <label htmlFor="solicitorFirm">
            Firm
            <input id="solicitorFirm" name="solicitorFirm" className="mt-1 block w-full border px-3 py-2" />
          </label>
          <label htmlFor="solicitorPhone">
            Solicitor phone
            <input id="solicitorPhone" name="solicitorPhone" type="tel" required className="mt-1 block w-full border px-3 py-2" />
          </label>
          <label htmlFor="solicitorEmail">
            Solicitor email
            <input id="solicitorEmail" name="solicitorEmail" type="email" required className="mt-1 block w-full border px-3 py-2" />
          </label>
        </>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend>Realtor</legend>
        <label>
          <input
            type="radio"
            name="contactType"
            value="direct"
            checked={contactType === "direct"}
            onChange={() => setContactType("direct")}
          />{" "}
          Buyers contact me
        </label>
        <label>
          <input
            type="radio"
            name="contactType"
            value="agent"
            checked={contactType === "agent"}
            onChange={() => setContactType("agent")}
          />{" "}
          Choose a realtor
        </label>
        <label>
          <input
            type="radio"
            name="contactType"
            value="specified"
            checked={contactType === "specified"}
            onChange={() => setContactType("specified")}
          />{" "}
          Specify a realtor
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
          <label className="flex items-start gap-2 border p-3">
            <input
              type="checkbox"
              name="agentLeads"
              value="1"
              checked={agentLeads}
              onChange={(event) => setAgentLeads(event.target.checked)}
              className="mt-1"
            />
            <span>
              Let realtors in {leadTown} contact me about selling.
              <span className="block text-sm text-zinc-600">
                Free for you. Your number is not shown publicly; up to three local realtors can
                ask us for it.
              </span>
            </span>
          </label>
        </>
      ) : contactType === "specified" ? (
        <>
          <label htmlFor="realtorName">
            Realtor name
            <input id="realtorName" name="realtorName" required className="mt-1 block w-full border px-3 py-2" />
          </label>
          <label htmlFor="realtorAgency">
            Agency
            <input id="realtorAgency" name="realtorAgency" className="mt-1 block w-full border px-3 py-2" />
          </label>
          <label htmlFor="realtorPhone">
            Realtor phone
            <input id="realtorPhone" name="realtorPhone" type="tel" required className="mt-1 block w-full border px-3 py-2" />
          </label>
          <label htmlFor="realtorEmail">
            Realtor email
            <input id="realtorEmail" name="realtorEmail" type="email" required className="mt-1 block w-full border px-3 py-2" />
          </label>
        </>
      ) : (
        <label htmlFor="agentId">
          Realtor
          <select
            id="agentId"
            name="agentId"
            required
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            className="mt-1 block w-full border px-3 py-2"
          >
            {agents.length === 0 ? (
              <option value="">No realtors registered for this region</option>
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
          {agents.length === 0 ? (
            <>
              No realtors registered for this region.{" "}
              <Link href={agentRegisterHref}>Add your details and region</Link>
            </>
          ) : (
            <Link href="/agents">Browse the agent directory</Link>
          )}
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
