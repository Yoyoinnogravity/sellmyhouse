import { NextResponse } from "next/server";
import {
  ListingPhotoError,
  removeListingPhotos,
  saveListingPhotos,
} from "@/lib/listingPhotos";
import { prisma } from "@/lib/prisma";
import { formatFieldError, validateProperty } from "@/lib/propertyStandard";
import { getUserFromCookie } from "@/lib/session";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+().\-\s]+$/;
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{0,79}$/u;

type SpecifiedContacts = {
  realtor: boolean;
  solicitor: boolean;
  realtorAgency: string;
  solicitorName: string;
  solicitorFirm: string;
  solicitorPhone: string;
  solicitorEmail: string;
};

export async function POST(request: Request) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }

  let body: unknown;
  let photos: Blob[] = [];
  let specified: SpecifiedContacts = {
    realtor: false,
    solicitor: false,
    realtorAgency: "",
    solicitorName: "",
    solicitorFirm: "",
    solicitorPhone: "",
    solicitorEmail: "",
  };

  try {
    const parsed = await readPublishRequest(request);
    body = parsed.body;
    photos = parsed.photos;
    specified = parsed.specified;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const validated = validateProperty(body, {
    defaultSource: "manual",
    requireAgentId: true,
  });
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.errors.map(formatFieldError).join(" ") },
      { status: 400 },
    );
  }

  const listing = validated.value;
  const solicitor = await resolveSolicitorId(body, specified.solicitor);
  if (!solicitor.ok) {
    return NextResponse.json({ error: solicitor.error }, { status: 400 });
  }

  const named = namedContacts(listing, specified);
  if (!named.ok) {
    return NextResponse.json({ error: named.error }, { status: 400 });
  }

  let images: string[] = [];
  try {
    images = await saveListingPhotos(photos);
  } catch (error) {
    const message = error instanceof ListingPhotoError ? error.message : "The pictures could not be saved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const property = await prisma.property.create({
      data: {
        title: listing.title,
        price: listing.price,
        location: listing.location,
        description: listing.description,
        image: images[0] ?? null,
        images: images.length > 0 ? JSON.stringify(images) : null,
        metadata: named.metadata,
        contactType: listing.contactType,
        contactName: listing.contactName,
        contactPhone: listing.contactPhone,
        contactEmail: listing.contactEmail,
        source: "manual",
        agentId: listing.contactType === "agent" ? listing.agentId : null,
        solicitorId: solicitor.solicitorId,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: property.id }, { status: 201 });
  } catch {
    await removeListingPhotos(images);
    return NextResponse.json({ error: "Could not publish this listing." }, { status: 500 });
  }
}

async function readPublishRequest(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("multipart/form-data")) {
    return {
      body: await request.json(),
      photos: [] as Blob[],
      specified: emptySpecified(),
    };
  }

  const form = await request.formData();
  const contactChoice = String(form.get("contactType") ?? "");
  const solicitorChoice = String(form.get("solicitorChoice") ?? "");
  const specifiedRealtor = contactChoice === "specified";
  const photos = form
    .getAll("photos")
    .filter((item) => item instanceof Blob);

  return {
    body: {
      title: form.get("title"),
      price: form.get("price"),
      location: form.get("location"),
      description: form.get("description"),
      contactType: contactChoice === "agent" ? "agent" : "direct",
      contactName: specifiedRealtor ? form.get("realtorName") : form.get("contactName"),
      contactPhone: specifiedRealtor ? form.get("realtorPhone") : form.get("contactPhone"),
      contactEmail: specifiedRealtor ? form.get("realtorEmail") : form.get("contactEmail"),
      agentId: contactChoice === "agent" ? form.get("agentId") : null,
      solicitorId: solicitorChoice === "now" ? form.get("solicitorId") : null,
      source: "manual",
    },
    photos,
    specified: {
      realtor: specifiedRealtor,
      solicitor: solicitorChoice === "specify",
      realtorAgency: text(form.get("realtorAgency")),
      solicitorName: text(form.get("solicitorName")),
      solicitorFirm: text(form.get("solicitorFirm")),
      solicitorPhone: text(form.get("solicitorPhone")),
      solicitorEmail: text(form.get("solicitorEmail")),
    },
  };
}

function emptySpecified(): SpecifiedContacts {
  return {
    realtor: false,
    solicitor: false,
    realtorAgency: "",
    solicitorName: "",
    solicitorFirm: "",
    solicitorPhone: "",
    solicitorEmail: "",
  };
}

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function namedContacts(
  listing: { contactName: string | null; contactPhone: string | null; contactEmail: string | null },
  specified: SpecifiedContacts,
): { ok: true; metadata: string | null } | { ok: false; error: string } {
  const metadata: Record<string, string> = {};

  if (specified.realtor) {
    if (!personName(listing.contactName) || !phone(listing.contactPhone) || !email(listing.contactEmail)) {
      return { ok: false, error: "Enter the realtor's name, phone, and email." };
    }
    metadata.contactRole = "realtor";
    if (specified.realtorAgency) {
      if (specified.realtorAgency.length > 120) {
        return { ok: false, error: "Enter a shorter agency name." };
      }
      metadata.realtorAgency = specified.realtorAgency;
    }
  }

  if (specified.solicitor) {
    if (!personName(specified.solicitorName) || !phone(specified.solicitorPhone) || !email(specified.solicitorEmail)) {
      return { ok: false, error: "Enter the solicitor's name, phone, and email." };
    }
    metadata.solicitorName = specified.solicitorName;
    metadata.solicitorFirm = specified.solicitorFirm || specified.solicitorName;
    metadata.solicitorPhone = specified.solicitorPhone;
    metadata.solicitorEmail = specified.solicitorEmail.toLowerCase();
  }

  return { ok: true, metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null };
}

function personName(value: string | null) {
  return Boolean(value && namePattern.test(value));
}

function phone(value: string | null) {
  if (!value || value.length > 30 || !phonePattern.test(value)) return false;
  return value.replace(/\D/g, "").length >= 6;
}

function email(value: string | null) {
  return Boolean(value && value.length <= 120 && emailPattern.test(value));
}

async function resolveSolicitorId(
  body: unknown,
  specifying: boolean,
): Promise<{ ok: true; solicitorId: number | null } | { ok: false; error: string }> {
  if (specifying) return { ok: true, solicitorId: null };
  if (!body || typeof body !== "object" || !("solicitorId" in body)) {
    return { ok: true, solicitorId: null };
  }

  const value = (body as { solicitorId?: unknown }).solicitorId;
  if (value == null || value === "") {
    return { ok: true, solicitorId: null };
  }

  const solicitorId =
    typeof value === "number" && Number.isInteger(value)
      ? value
      : typeof value === "string" && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : null;
  if (solicitorId == null || solicitorId < 1) {
    return { ok: false, error: "Choose a solicitor." };
  }

  const selectedSolicitor = await prisma.solicitor.findUnique({
    where: { id: solicitorId },
    select: { id: true },
  });
  if (!selectedSolicitor) {
    return { ok: false, error: "That solicitor is not available." };
  }

  return { ok: true, solicitorId: selectedSolicitor.id };
}
