import { NextResponse } from "next/server";
import { ensureAgency, getAgentFromCookie } from "@/lib/agent";
import { prisma } from "@/lib/prisma";
import {
  formatFieldError,
  isPropertySource,
  validateAgent,
  validatePropertyBatch,
  type PropertySource,
} from "@/lib/propertyStandard";
import { getUserFromCookie } from "@/lib/session";
import {
  isUploadMode,
  parseUploadBody,
  UploadParseError,
  type UploadMode,
} from "@/lib/uploadParse";

const INSERT_CHUNK = 40;

export async function POST(request: Request) {
  const user = await getUserFromCookie();
  const agentSession = await getAgentFromCookie();
  if (!user && !agentSession) {
    return NextResponse.json({ error: "You need to log in." }, { status: 401 });
  }

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
    if (!user && agentSession && !hasAgentIdentity(agentInput)) {
      const self = await prisma.agent.findUnique({
        where: { id: agentSession.id },
        select: {
          name: true,
          agency: true,
          phone: true,
          email: true,
          country: true,
        },
      });
      if (!self) {
        return NextResponse.json({ error: "You need to log in." }, { status: 401 });
      }
      agentInput = self;
    }
  } catch (error) {
    const message =
      error instanceof UploadParseError
        ? error.message
        : "The upload could not be read.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const agentResult = validateAgent(agentInput);
  const batchResult = validatePropertyBatch(propertiesInput, {
    bulk: mode === "bulk",
    defaultContactType: "agent",
    defaultSource: source,
    requireAgentId: false,
  });

  if (!agentResult.ok || !batchResult.ok) {
    const errors = [
      ...(agentResult.ok ? [] : agentResult.errors),
      ...(batchResult.ok ? [] : batchResult.errors),
    ];
    return NextResponse.json(
      {
        error: errors.map(formatFieldError).join(" "),
        errors: errors.map((error) => ({
          ...error,
          message: formatFieldError(error),
        })),
      },
      { status: 400 },
    );
  }

  const agent = agentResult.value;
  const listings = batchResult.value;

  if (!user && agentSession && agent.email !== agentSession.email) {
    return NextResponse.json(
      { error: "You can only upload listings for your own agent account." },
      { status: 403 },
    );
  }

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.agent.findFirst({
        where: { email: agent.email },
        orderBy: { id: "asc" },
      });
      const record = existing
        ? await tx.agent.update({
            where: { id: existing.id },
            data: {
              name: agent.name,
              agency: agent.agency,
              phone: agent.phone,
              country: agent.country,
            },
          })
        : await tx.agent.create({ data: agent });

      await ensureAgency(tx, {
        agentId: record.id,
        name: agent.agency,
        country: agent.country,
      });

      const ids: number[] = [];
      for (let index = 0; index < listings.length; index += INSERT_CHUNK) {
        const created = await tx.property.createManyAndReturn({
          data: listings.slice(index, index + INSERT_CHUNK).map((listing) => ({
            title: listing.title,
            price: listing.price,
            location: listing.location,
            contactType: listing.contactType,
            contactName: listing.contactName,
            contactPhone: listing.contactPhone,
            contactEmail: listing.contactEmail,
            source: listing.source,
            agentId: record.id,
            solicitorId: null,
          })),
          select: { id: true },
        });
        ids.push(...created.map((property) => property.id));
      }

      return { agentId: record.id, agentName: record.name, ids };
    });

    return NextResponse.json(
      {
        agentId: saved.agentId,
        agentName: saved.agentName,
        count: saved.ids.length,
        ids: saved.ids,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "The listings could not be saved." },
      { status: 500 },
    );
  }
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

  if (contentType.includes("text/csv")) {
    return { mode: "csv", payload: await request.text() };
  }

  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const formData = await request.formData();
    const file = formData.get("file");
    let payload = formString(formData.get("payload"));
    if (file instanceof File && file.size > 0) {
      if (file.size > 1_000_000) {
        throw new UploadParseError("That file is too large.");
      }
      const fileText = (await file.text()).trim();
      const fileMode = modeFromFile(file.name, fileText);
      payload = fileText;
      const formMode = formString(formData.get("mode"));
      return {
        mode: isUploadMode(formMode) ? formMode : fileMode,
        source: formString(formData.get("source")),
        agent: agentFromForm(formData),
        properties: formString(formData.get("properties")),
        payload,
        title: formString(formData.get("title")),
        price: formString(formData.get("price")),
        location: formString(formData.get("location")),
      };
    }

    return {
      mode: formString(formData.get("mode")),
      source: formString(formData.get("source")),
      agent: agentFromForm(formData),
      properties: formString(formData.get("properties")),
      payload,
      title: formString(formData.get("title")),
      price: formString(formData.get("price")),
      location: formString(formData.get("location")),
    };
  }

  throw new UploadParseError("Send JSON, CSV, or form data.");
}

function sourceForMode(mode: UploadMode, explicit: unknown): PropertySource {
  if (typeof explicit === "string" && explicit.trim()) {
    const source = explicit.trim();
    if (!isPropertySource(source)) {
      throw new UploadParseError("Source must be manual, imported, or agency.");
    }
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

function modeFromFile(name: string, text: string): UploadMode {
  const lower = name.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  return "csv";
}

function hasAgentIdentity(agent: unknown) {
  if (!agent || typeof agent !== "object") return false;
  return ["name", "agency", "phone", "email", "country"].some((field) => {
    const value = (agent as Record<string, unknown>)[field];
    return typeof value === "string" && value.trim() !== "";
  });
}

function formString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
