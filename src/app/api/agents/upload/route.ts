import { NextResponse } from "next/server";
import readXlsxFile from "read-excel-file/node";
import { ensureAgency, getAgentFromCookie } from "@/lib/agent";
import { newManageKey, withManageHash } from "@/lib/manageKey";
import { prisma } from "@/lib/prisma";
import {
  formatFieldError,
  isPropertySource,
  validateAgent,
  validatePropertyBatch,
  type AplsProperty,
  type PropertySource,
} from "@/lib/propertyStandard";
import { currentSite, defaultPropertyType } from "@/lib/site";
import {
  isUploadMode,
  parseUploadBody,
  UploadParseError,
  type UploadMode,
} from "@/lib/uploadParse";

// Anyone can upload a file of listings: a seller with one home, or a
// realtor with two hundred. No account is needed. Each listing gets its own
// private edit link, returned once in the response. A signed-in agent's
// listings are attached to their agent profile instead.

const INSERT_CHUNK = 40;
const MAX_FILE_BYTES = 4_000_000;

export async function POST(request: Request) {
  const agentSession = await getAgentFromCookie();

  let mode: UploadMode;
  let source: PropertySource;
  let agentInput: unknown;
  let propertiesInput: unknown[];

  try {
    const body = await readBody(request);
    const parsed = parseUploadBody(body);
    mode = parsed.mode;
    source = sourceForMode(parsed.mode, parsed.source);
    agentInput = parsed.agent;
    propertiesInput = parsed.properties;
  } catch (error) {
    const message =
      error instanceof UploadParseError ? error.message : "The upload could not be read.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const site = await currentSite();
  const asAgent = Boolean(agentSession);
  const batchResult = validatePropertyBatch(propertiesInput, {
    bulk: mode === "bulk",
    defaultContactType: asAgent ? "agent" : "direct",
    defaultSource: source,
    requireAgentId: false,
  });

  if (!batchResult.ok) return errorResponse(batchResult.errors);

  const listings = batchResult.value;

  try {
    let agentId: number | null = null;
    let agentName: string | null = null;

    if (agentSession) {
      const self = await prisma.agent.findUnique({
        where: { id: agentSession.id },
        select: { name: true, agency: true, phone: true, email: true, country: true },
      });
      if (!self) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
      const agentResult = validateAgent(hasAgentIdentity(agentInput) ? agentInput : self);
      if (!agentResult.ok) return errorResponse(agentResult.errors);
      if (agentResult.value.email !== agentSession.email) {
        return NextResponse.json(
          { error: "You can only upload listings for your own agent account." },
          { status: 403 },
        );
      }
      const record = await prisma.agent.update({
        where: { id: agentSession.id },
        data: {
          name: agentResult.value.name,
          agency: agentResult.value.agency,
          phone: agentResult.value.phone,
          country: agentResult.value.country,
        },
      });
      await ensureAgency(prisma, {
        agentId: record.id,
        name: agentResult.value.agency,
        country: agentResult.value.country,
      });
      agentId = record.id;
      agentName = record.name;
    }

    const keys = listings.map(() => newManageKey());
    const rows = listings.map((listing, index) => toRow(listing, keys[index].hash, agentId, defaultPropertyType(site)));

    const ids = await prisma.$transaction(async (tx) => {
      const created: number[] = [];
      for (let index = 0; index < rows.length; index += INSERT_CHUNK) {
        const saved = await tx.property.createManyAndReturn({
          data: rows.slice(index, index + INSERT_CHUNK),
          select: { id: true },
        });
        created.push(...saved.map((property) => property.id));
      }
      return created;
    });

    return NextResponse.json(
      {
        agentId,
        agentName: agentName ?? listings[0]?.contactName ?? "you",
        count: ids.length,
        ids,
        listings: ids.map((id, index) => ({
          id,
          title: listings[index].title,
          manageKey: keys[index].key,
        })),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "The listings could not be saved." }, { status: 500 });
  }
}

function toRow(listing: AplsProperty, manageHash: string, agentId: number | null, fallbackType: string) {
  const metadata = withManageHash(listing.metadata ? JSON.stringify(listing.metadata) : null, manageHash);
  return {
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    location: listing.location,
    propertyType: listing.propertyType ?? fallbackType,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    builtUp: listing.builtUp,
    landSize: listing.landSize,
    tenure: listing.tenure,
    description: listing.description,
    image: listing.images[0] ?? null,
    images: listing.images.length > 0 ? JSON.stringify(listing.images) : null,
    metadata,
    contactType: agentId ? listing.contactType : "direct",
    contactName: listing.contactName,
    contactPhone: listing.contactPhone,
    contactEmail: listing.contactEmail,
    source: listing.source,
    agentId: agentId && listing.contactType === "agent" ? agentId : null,
    solicitorId: null,
  };
}

function errorResponse(errors: { field: string; message: string; index?: number }[]) {
  return NextResponse.json(
    {
      error: errors.map(formatFieldError).join(" "),
      errors: errors.map((error) => ({ ...error, message: formatFieldError(error) })),
    },
    { status: 400 },
  );
}

async function readBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      throw new UploadParseError("The JSON could not be read.");
    }
  }

  if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
    return { mode: "csv", payload: await request.text() };
  }

  if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    // Left empty by people; spam bots usually fill it in.
    if (formString(formData.get("website"))) throw new UploadParseError("The upload could not be read.");

    const formMode = formString(formData.get("mode"));
    const base = {
      source: formString(formData.get("source")),
      agent: agentFromForm(formData),
    };
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) throw new UploadParseError("That file is too large. Please split it into smaller files.");
      const name = file.name.toLowerCase();
      if (name.endsWith(".xlsx")) {
        let sheets: { sheet: string; data: unknown[][] }[];
        try {
          sheets = (await readXlsxFile(Buffer.from(await file.arrayBuffer()))) as unknown as {
            sheet: string;
            data: unknown[][];
          }[];
        } catch {
          throw new UploadParseError("That Excel file could not be read. Save it as .xlsx or CSV and try again.");
        }
        // Our template has Listings, Guide and Example sheets: only Listings is read,
        // so the example rows are never published. Other workbooks: the first sheet.
        const chosen = sheets.find((sheet) => sheet.sheet.trim().toLowerCase() === "listings") ?? sheets[0];
        if (!chosen) throw new UploadParseError("That Excel file has no sheets.");
        return { ...base, mode: "csv", rows: chosen.data };
      }
      if (name.endsWith(".xls") || name.endsWith(".numbers") || name.endsWith(".ods")) {
        throw new UploadParseError("Please save the file as .xlsx or CSV, then upload it again.");
      }
      const text = (await file.text()).trim();
      const fileMode: UploadMode = name.endsWith(".json") || text.startsWith("{") || text.startsWith("[") ? "json" : "csv";
      return {
        ...base,
        mode: isUploadMode(formMode) && formMode !== "manual" ? formMode : fileMode,
        payload: text,
      };
    }

    return {
      ...base,
      mode: formMode,
      properties: formString(formData.get("properties")),
      payload: formString(formData.get("payload")),
    };
  }

  throw new UploadParseError("Send a CSV, Excel or JSON file.");
}

function sourceForMode(mode: UploadMode, explicit: unknown): PropertySource {
  if (typeof explicit === "string" && explicit.trim()) {
    const source = explicit.trim();
    if (!isPropertySource(source)) throw new UploadParseError("Source must be manual, imported, or agency.");
    return source;
  }
  return mode === "manual" ? "manual" : "imported";
}

function agentFromForm(formData: FormData) {
  return {
    name: formString(formData.get("name")),
    agency: formString(formData.get("agency")),
    phone: formString(formData.get("phone")),
    email: formString(formData.get("email")),
    country: formString(formData.get("country")),
  };
}

function hasAgentIdentity(agent: unknown) {
  if (!agent || typeof agent !== "object") return false;
  return ["name", "agency", "phone", "email", "country"].every((field) => {
    const value = (agent as Record<string, unknown>)[field];
    return typeof value === "string" && value.trim() !== "";
  });
}

function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
