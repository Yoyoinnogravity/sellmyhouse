import { APLS } from "@/lib/propertyStandard";

export type UploadMode = "json" | "csv" | "manual" | "bulk";

export class UploadParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadParseError";
  }
}

const LISTING_FIELDS = [
  "title",
  "price",
  "location",
  "contactType",
  "contactName",
  "contactPhone",
  "contactEmail",
  "source",
  "agentId",
] as const;

const AGENT_FIELDS = ["name", "agency", "phone", "email", "country"] as const;

const CSV_FIELDS = new Set<string>([...LISTING_FIELDS, ...AGENT_FIELDS]);

export function isUploadMode(value: unknown): value is UploadMode {
  return (
    value === "json" ||
    value === "csv" ||
    value === "manual" ||
    value === "bulk"
  );
}

export function parseUploadBody(input: unknown): {
  mode: UploadMode;
  source: unknown;
  agent: unknown;
  properties: unknown[];
} {
  if (Array.isArray(input)) {
    const parsed = parseListingDocument(input);
    return {
      mode: "json",
      source: undefined,
      agent: parsed.agent,
      properties: parsed.properties,
    };
  }

  const record = asRecord(input);
  if (!record) {
    throw new UploadParseError("Send JSON, CSV, or form data.");
  }

  if (
    record.mode != null &&
    record.mode !== "" &&
    !isUploadMode(record.mode)
  ) {
    throw new UploadParseError(
      "Choose JSON, CSV, manual entry, or bulk upload.",
    );
  }

  const payload = typeof record.payload === "string" ? record.payload.trim() : "";
  const mode = inferMode(record.mode, payload, hasListingFields(record));
  const formAgent = presentAgent(record.agent) ?? presentAgent(agentFromRecord(record));

  if (payload) {
    const parsed = parsePayload(payload, mode);
    return {
      mode,
      source: record.source,
      agent: mergeAgent(formAgent, parsed.agent),
      properties: parsed.properties,
    };
  }

  const propertiesValue = parsePropertiesField(record.properties);
  if (Array.isArray(propertiesValue)) {
    const parsed = parseListingDocument(propertiesValue);
    return {
      mode,
      source: record.source,
      agent: mergeAgent(formAgent, parsed.agent),
      properties: parsed.properties,
    };
  }

  if (hasListingFields(record)) {
    return {
      mode,
      source: record.source,
      agent: formAgent,
      properties: [listingFromRecord(record)],
    };
  }

  if (Array.isArray(record.properties) === false && record.properties == null) {
    throw new UploadParseError("Add at least one listing.");
  }

  throw new UploadParseError("Add at least one listing.");
}

function parsePayload(
  payload: string,
  mode: UploadMode,
): { agent: unknown; properties: unknown[] } {
  const text = payload.replace(/^\uFEFF/, "").trim();
  if (!text) throw new UploadParseError("Add at least one listing.");

  if (text.length > 1_000_000) {
    throw new UploadParseError("That file is too large.");
  }

  const asCsv =
    mode === "csv" ||
    (mode === "bulk" && !text.startsWith("{") && !text.startsWith("["));

  if (asCsv) return parseListingDocument(csvToRecords(text));

  try {
    return parseListingDocument(JSON.parse(text) as unknown);
  } catch (error) {
    if (error instanceof UploadParseError) throw error;
    throw new UploadParseError("The JSON could not be read.");
  }
}

function parsePropertiesField(value: unknown): unknown {
  if (typeof value !== "string" || !value.trim()) return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new UploadParseError("The listings could not be read.");
  }
}

export function parseListingDocument(value: unknown): {
  agent: unknown;
  properties: unknown[];
} {
  if (Array.isArray(value)) {
    if (value.length > APLS.batchMax + 1) {
      throw new UploadParseError(
        `An upload can include at most ${APLS.batchMax} listings.`,
      );
    }
    const emails = new Set<string>();
    const properties = value.map((item) => {
      const record = asRecord(item);
      if (!record) return item;
      const email = readString(record.email).toLowerCase();
      if (email) emails.add(email);
      return listingFromRecord(record);
    });
    if (emails.size > 1) {
      throw new UploadParseError(
        "Every listing in one upload must use the same agent email.",
      );
    }
    const first = asRecord(value[0]);
    return {
      agent: first ? presentAgent(agentFromRecord(first)) : null,
      properties,
    };
  }

  const record = asRecord(value);
  if (!record) {
    throw new UploadParseError("The upload must be a JSON object or array.");
  }

  if (Array.isArray(record.properties)) {
    const parsed = parseListingDocument(record.properties);
    return {
      agent: mergeAgent(presentAgent(agentFromRecord(record)), parsed.agent),
      properties: parsed.properties,
    };
  }

  if (hasListingFields(record)) {
    return {
      agent: presentAgent(agentFromRecord(record)),
      properties: [listingFromRecord(record)],
    };
  }

  throw new UploadParseError("Add at least one listing.");
}

function csvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new UploadParseError(
      "The CSV needs a header row and at least one listing.",
    );
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const seen = new Set<string>();
  for (const header of headers) {
    if (!header) throw new UploadParseError("The CSV has an empty column name.");
    if (seen.has(header)) {
      throw new UploadParseError(`The CSV repeats the ${header} column.`);
    }
    if (!CSV_FIELDS.has(header)) {
      throw new UploadParseError(
        `The CSV column ${header} is not part of the listing standard.`,
      );
    }
    seen.add(header);
  }

  for (const required of ["title", "price", "location"]) {
    if (!seen.has(required)) {
      throw new UploadParseError(
        "The CSV must include title, price, and location columns.",
      );
    }
  }

  return rows.slice(1).map((row, index) => {
    if (row.length > headers.length) {
      throw new UploadParseError(`Listing ${index + 1} has too many columns.`);
    }
    const record: Record<string, string> = {};
    headers.forEach((header, column) => {
      record[header] = (row[column] ?? "").trim();
    });
    return record;
  });
}

function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (inQuotes) throw new UploadParseError("The CSV has an unclosed quote.");
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function mergeAgent(formAgent: unknown, fileAgent: unknown): unknown {
  const formCount = filledAgentFields(formAgent);
  const fileCount = filledAgentFields(fileAgent);
  if (formCount > 0 && fileCount > 0) {
    const formEmail = emailOf(formAgent);
    const fileEmail = emailOf(fileAgent);
    if (formEmail && fileEmail && formEmail !== fileEmail) {
      throw new UploadParseError(
        "The agent email on the form does not match the file.",
      );
    }
  }
  if (formCount === AGENT_FIELDS.length) return formAgent;
  if (fileCount === AGENT_FIELDS.length) return fileAgent;
  if (formCount > 0) return formAgent;
  return fileAgent;
}

function filledAgentFields(agent: unknown): number {
  const record = asRecord(agent);
  if (!record) return 0;
  return AGENT_FIELDS.filter((field) => readString(record[field]) !== "").length;
}

function agentFromRecord(record: Record<string, unknown>): Record<string, unknown> {
  if (record.agent && typeof record.agent === "object") {
    return asRecord(record.agent) ?? {};
  }
  return {
    name: record.name,
    agency: record.agency,
    phone: record.phone,
    email: record.email,
    country: record.country,
  };
}

function listingFromRecord(record: Record<string, unknown>): Record<string, unknown> {
  return {
    title: record.title,
    price: record.price,
    location: record.location,
    contactType: record.contactType,
    contactName: record.contactName,
    contactPhone: record.contactPhone,
    contactEmail: record.contactEmail,
    source: record.source,
    agentId: record.agentId,
  };
}

function hasListingFields(record: Record<string, unknown>): boolean {
  return ["title", "price", "location"].some((field) => {
    const value = record[field];
    return value != null && String(value).trim() !== "";
  });
}

function presentAgent(agent: unknown): unknown {
  const record = asRecord(agent);
  if (!record) return null;
  const hasValue = AGENT_FIELDS.some((field) => readString(record[field]) !== "");
  return hasValue ? record : null;
}

function emailOf(agent: unknown): string {
  const record = asRecord(agent);
  return record ? readString(record.email).toLowerCase() : "";
}

function inferMode(
  mode: unknown,
  payload: string,
  manualFields: boolean,
): UploadMode {
  if (isUploadMode(mode)) return mode;
  if (payload.startsWith("{") || payload.startsWith("[")) return "json";
  if (payload.includes(",")) return "csv";
  if (manualFields) return "manual";
  return "json";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
