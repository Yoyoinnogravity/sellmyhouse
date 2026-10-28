import { NextResponse } from "next/server";
import {
  ListingPhotoError,
  removeListingPhotos,
  saveListingPhotos,
} from "@/lib/listingPhotos";
import { createLeadForProperty } from "@/lib/leads";
import { newManageKey, withManageHash } from "@/lib/manageKey";
import { currencyForLocation } from "@/lib/currency";
import { rentalMetadata, shortStayProblem } from "@/lib/rental";
import { prisma } from "@/lib/prisma";
import { formatFieldError, validateProperty } from "@/lib/propertyStandard";
import { currentSite, defaultPropertyType } from "@/lib/site";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+().\-\s]+$/;
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{0,79}$/u;

type SpecifiedContacts = {
  realtor: boolean;
  solicitor: boolean;
  agentLeads: boolean;
  realtorAgency: string;
  solicitorName: string;
  solicitorFirm: string;
  solicitorPhone: string;
  solicitorEmail: string;
};

export async function POST(request: Request) {
  // Anyone can list a property without an account. A hidden "website"
  // field is left empty by people and usually filled in by spam bots.
  let body: unknown;
  let photos: Blob[] = [];
  let pin: { lat: number; lng: number } | null = null;
  let specified: SpecifiedContacts = {
    realtor: false,
    solicitor: false,
    agentLeads: false,
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
    pin = parsed.pin;
    specified = parsed.specified;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // The brand the seller is on (sellmyhouse, sellmycondo, sellmyland, sellmybungalow).
  const site = await currentSite();
  // A pin alone is enough: describe the place by its coordinates.
  const fields = body as Record<string, unknown>;
  if (fields && typeof fields === "object" && !fields.currency) {
    let currency = currencyForLocation(String(fields.location ?? ""));
    // Pin only, no place name: Singapore or Malaysia from the coordinates.
    if (!currency && pin) {
      if (pin.lat > 1.15 && pin.lat < 1.48 && pin.lng > 103.6 && pin.lng < 104.1) currency = "SGD";
      else if (pin.lat > 0.8 && pin.lat < 7.6 && pin.lng > 99.5 && pin.lng < 119.5) currency = "MYR";
    }
    if (currency) fields.currency = currency;
  }
  if (fields && typeof fields === "object" && !fields.propertyType) {
    fields.propertyType = defaultPropertyType(site);
  }
  if (pin && fields && typeof fields === "object" && !String(fields.location ?? "").trim()) {
    fields.location = `Near ${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}`;
  }

  if ((body as { saleType?: string }).saleType === "rent") {
    const record = body as Record<string, unknown>;
    const problem = shortStayProblem({ title: record.title, description: record.description, minLease: record.minLease });
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
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
  const manage = newManageKey();
  const rental = (body as { rental?: Record<string, string | number> | null }).rental ?? null;
  const areaUnit = String((body as { areaUnit?: unknown }).areaUnit ?? "");
  const extra = {
    ...(rental ?? {}),
    ...(["sq ft", "sq m", "acres", "hectares"].includes(areaUnit) && (listing.builtUp || listing.landSize) ? { areaUnit } : {}),
  };
  const metadata = withManageHash(withPin(withRental(named.metadata, Object.keys(extra).length ? extra : null), pin), manage.hash);

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
        currency: listing.currency,
        location: listing.location,
        description: listing.description,
        propertyType: listing.propertyType ?? defaultPropertyType(site),
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        builtUp: listing.builtUp,
        landSize: listing.landSize,
        tenure: listing.tenure,
        image: images[0] ?? null,
        images: images.length > 0 ? JSON.stringify(images) : null,
        metadata,
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

    // The seller asked for local realtors. Their number is held back from
    // the public page and offered to agents in the same town.
    if (specified.agentLeads && listing.contactType === "direct" && !specified.realtor && !rental) {
      await createLeadForProperty({
        propertyId: property.id,
        location: listing.location,
        site: site.id,
        contactName: listing.contactName,
        contactPhone: listing.contactPhone,
        contactEmail: listing.contactEmail,
      });
    }

    return NextResponse.json({ id: property.id, manageKey: manage.key }, { status: 201 });
  } catch (error) {
    console.error("publish failed", error);
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
      pin: null,
    };
  }

  const form = await request.formData();
  if (String(form.get("website") ?? "").trim() !== "") {
    throw new Error("Spam");
  }
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
      propertyType: text(form.get("propertyType")) || undefined,
      bedrooms: text(form.get("bedrooms")) || undefined,
      bathrooms: text(form.get("bathrooms")) || undefined,
      builtUp: text(form.get("builtUp")).replace(/[^0-9]/g, "") || undefined,
      landSize: text(form.get("landSize")).replace(/[^0-9]/g, "") || undefined,
      tenure: text(form.get("tenure")) || undefined,
      areaUnit: text(form.get("areaUnit")),
      contactType: contactChoice === "agent" ? "agent" : "direct",
      contactName: specifiedRealtor ? form.get("realtorName") : form.get("contactName"),
      contactPhone: specifiedRealtor ? form.get("realtorPhone") : form.get("contactPhone"),
      contactEmail: specifiedRealtor ? form.get("realtorEmail") : form.get("contactEmail"),
      agentId: contactChoice === "agent" ? form.get("agentId") : null,
      solicitorId: solicitorChoice === "now" ? form.get("solicitorId") : null,
      source: "manual",
      saleType: form.get("saleType") === "rent" ? "rent" : "sale",
      minLease: form.get("minLease"),
      rental: form.get("saleType") === "rent"
        ? rentalMetadata({
            deposit: form.get("deposit"),
            furnished: form.get("furnished"),
            availableFrom: form.get("availableFrom"),
            minLease: form.get("minLease"),
          })
        : null,
    },
    photos,
    pin: readPin(form.get("lat"), form.get("lng")),
    specified: {
      realtor: specifiedRealtor,
      solicitor: solicitorChoice === "specify",
      agentLeads: contactChoice === "direct" && form.get("agentLeads") === "1",
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
    agentLeads: false,
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
    if (!personName(listing.contactName) || (!phone(listing.contactPhone) && !email(listing.contactEmail))) {
      return { ok: false, error: "Enter the realtor's name, and a phone number or email." };
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

// The seller's map pin, if they dropped one.
function readPin(lat: FormDataEntryValue | null, lng: FormDataEntryValue | null) {
  const latitude = Number(typeof lat === "string" ? lat : "");
  const longitude = Number(typeof lng === "string" ? lng : "");
  if (
    typeof lat !== "string" || typeof lng !== "string" || lat === "" || lng === "" ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 || Math.abs(longitude) > 180
  ) {
    return null;
  }
  return { lat: Math.round(latitude * 1e6) / 1e6, lng: Math.round(longitude * 1e6) / 1e6 };
}

// Adds the rental details (saleType "rent", deposit, furnished…) to the metadata.
function withRental(metadata: string | null, rental: Record<string, string | number> | null) {
  if (!rental) return metadata;
  let parsed: Record<string, unknown> = {};
  if (metadata) {
    try {
      parsed = JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }
  return JSON.stringify({ ...parsed, ...rental });
}

// Adds the pin to the listing's metadata, where the map reads lat and lng.
function withPin(metadata: string | null, pin: { lat: number; lng: number } | null) {
  if (!pin) return metadata;
  let parsed: Record<string, unknown> = {};
  if (metadata) {
    try {
      parsed = JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }
  return JSON.stringify({ ...parsed, lat: pin.lat, lng: pin.lng });
}
