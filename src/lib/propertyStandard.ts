/**
 * APLS (Agent Property Listing Standard).
 * A listing needs only a whole-number price, a location (a map pin is
 * enough; see uploadParse) and a contact name. Everything else may be left
 * blank: a missing title is written from the details. Contact is direct
 * (name, plus phone and email if given) or an estate agent.
 * source is "manual", "imported", or "agency".
 * Optional details are currency, propertyType, bedrooms, bathrooms, builtUp,
 * landSize, tenure, images, description, solicitorId, and metadata.
 * A bulk upload contains 20 to 200 listings. Any other upload contains 1 to 200.
 */

export const PROPERTY_SOURCES = ["manual", "imported", "agency"] as const;
export const CONTACT_TYPES = ["direct", "agent"] as const;

export type PropertySource = (typeof PROPERTY_SOURCES)[number];
export type ContactType = (typeof CONTACT_TYPES)[number];

export const APLS = {
  titleMax: 140,
  locationMax: 120,
  nameMax: 80,
  agencyMax: 120,
  countryMax: 80,
  phoneMinDigits: 6,
  phoneMax: 30,
  emailMax: 120,
  priceMin: 1,
  priceMax: 2_000_000_000,
  batchMax: 200,
  bulkMin: 20,
  bulkMax: 200,
} as const;

export type FieldError = {
  field: string;
  message: string;
  index?: number;
};

export type AplsAgent = {
  name: string;
  agency: string;
  phone: string;
  email: string;
  country: string;
};

export type AplsTenure = "Freehold" | "Leasehold" | (string & {});

export type AplsMetadata = Record<string, string | number | boolean | null>;

export type AplsProperty = {
  title: string;
  price: number;
  currency: string | null;
  location: string;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtUp: number | null;
  landSize: number | null;
  tenure: AplsTenure | null;
  images: string[];
  description: string | null;
  contactType: ContactType;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  source: PropertySource | null;
  solicitorId: number | null;
  agentId: number | null;
  metadata: AplsMetadata | null;
};

type ValidationSuccess<T> = { ok: true; value: T };
type ValidationFailure = { ok: false; errors: FieldError[] };

export type ValidatePropertyOptions = {
  index?: number;
  defaultContactType?: ContactType;
  defaultSource?: PropertySource | null;
  requireAgentId?: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+().\-\s]+$/;
const namePattern = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\s.'&,()/-]{0,79}$/u;
const agencyPattern = /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9\s&.'-]{0,119}$/u;
const countryPattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]{1,79}$/u;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isInteger(value)) return String(value);
  return "";
}

function readInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function withIndex(index: number | undefined, error: FieldError): FieldError {
  return index == null ? error : { ...error, index };
}

export function formatFieldError(error: FieldError): string {
  const prefix = error.index == null ? "" : `Listing ${error.index + 1}: `;
  return `${prefix}${error.message}`;
}

export function isPropertySource(value: unknown): value is PropertySource {
  return (
    value === "manual" || value === "imported" || value === "agency"
  );
}

export function validateAgent(
  input: unknown,
): ValidationSuccess<AplsAgent> | ValidationFailure {
  const record = asRecord(input) ?? {};
  const errors: FieldError[] = [];
  const name = readString(record.name);
  const agency = readString(record.agency);
  const phone = readString(record.phone);
  const email = readString(record.email).toLowerCase();
  const country = readString(record.country);

  if (!name || !namePattern.test(name)) {
    errors.push({
      field: "name",
      message: "Enter the agent name.",
    });
  }
  if (!agency || !agencyPattern.test(agency)) {
    errors.push({
      field: "agency",
      message: "Enter the agency name.",
    });
  }
  if (!isPhone(phone)) {
    errors.push({
      field: "phone",
      message: "Enter the agent phone number.",
    });
  }
  if (!email || email.length > APLS.emailMax || !emailPattern.test(email)) {
    errors.push({
      field: "email",
      message: "Enter a valid agent email.",
    });
  }
  if (!country || !countryPattern.test(country)) {
    errors.push({
      field: "country",
      message: "Enter the agent country.",
    });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { name, agency, phone, email, country } };
}

export function validateProperty(
  input: unknown,
  options: ValidatePropertyOptions = {},
): ValidationSuccess<AplsProperty> | ValidationFailure {
  const record = asRecord(input);
  const index = options.index;
  if (!record) {
    return {
      ok: false,
      errors: [
        withIndex(index, {
          field: "listing",
          message: "Each listing must be an object.",
        }),
      ],
    };
  }

  const errors: FieldError[] = [];
  const title = readString(record.title);
  const location = readString(record.location);
  const price = readInteger(record.price);
  const contactTypeValue = readString(record.contactType);
  const contactType =
    contactTypeValue === "direct" || contactTypeValue === "agent"
      ? contactTypeValue
      : contactTypeValue
        ? null
        : (options.defaultContactType ?? null);

  // Only the price and location are required. A blank title is written
  // from the details given, for example "3-bedroom house in Ipoh".
  if (title.length > APLS.titleMax) {
    errors.push({
      field: "title",
      message: `Enter a title up to ${APLS.titleMax} characters.`,
    });
  }

  if (!location) {
    errors.push({ field: "location", message: "Enter a location." });
  } else if (location.length > APLS.locationMax) {
    errors.push({
      field: "location",
      message: `Enter a location up to ${APLS.locationMax} characters.`,
    });
  }

  if (price == null || price < APLS.priceMin || price > APLS.priceMax) {
    errors.push({
      field: "price",
      message: `Enter a whole-number price from ${APLS.priceMin} to ${APLS.priceMax}.`,
    });
  }

  if (!contactType) {
    errors.push({
      field: "contactType",
      message: "Choose direct contact or an estate agent.",
    });
  }

  const sourceValue = readString(record.source);
  let source: PropertySource | null = options.defaultSource ?? null;
  if (sourceValue) {
    if (!isPropertySource(sourceValue)) {
      errors.push({
        field: "source",
        message: "Source must be manual, imported, or agency.",
      });
    } else {
      source = sourceValue;
    }
  }

  const contactName = readString(record.contactName);
  const contactPhone = readString(record.contactPhone);
  const contactEmail = readString(record.contactEmail).toLowerCase();
  let agentId: number | null = null;

  if (contactType === "direct") {
    // The contact name is required; phone and email are optional but
    // checked when given.
    if (!contactName) {
      errors.push({ field: "contactName", message: "Enter the seller's or realtor's name." });
    } else if (!namePattern.test(contactName)) {
      errors.push({ field: "contactName", message: "Enter a contact name." });
    }
    if (contactPhone && !isPhone(contactPhone)) {
      errors.push({
        field: "contactPhone",
        message: "Enter a contact phone number.",
      });
    }
    if (
      contactEmail &&
      (contactEmail.length > APLS.emailMax || !emailPattern.test(contactEmail))
    ) {
      errors.push({
        field: "contactEmail",
        message: "Enter a valid contact email.",
      });
    }
  } else if (contactType === "agent") {
    if (contactName && !namePattern.test(contactName)) {
      errors.push({ field: "contactName", message: "Enter a contact name." });
    }
    if (contactPhone && !isPhone(contactPhone)) {
      errors.push({
        field: "contactPhone",
        message: "Enter a contact phone number.",
      });
    }
    if (
      contactEmail &&
      (contactEmail.length > APLS.emailMax || !emailPattern.test(contactEmail))
    ) {
      errors.push({
        field: "contactEmail",
        message: "Enter a valid contact email.",
      });
    }

    const parsedAgentId = readInteger(record.agentId);
    if (options.requireAgentId) {
      if (parsedAgentId == null || parsedAgentId < 1) {
        errors.push({
          field: "agentId",
          message: "Choose an estate agent.",
        });
      } else {
        agentId = parsedAgentId;
      }
    } else if (record.agentId != null && record.agentId !== "") {
      if (parsedAgentId == null || parsedAgentId < 1) {
        errors.push({
          field: "agentId",
          message: "Choose an estate agent.",
        });
      }
    }
  }

  const currency = readCurrency(record.currency, errors);
  const propertyType = readPropertyType(record.propertyType, errors);
  const bedrooms = readMeasure(record, "bedrooms", 30, errors);
  const bathrooms = readMeasure(record, "bathrooms", 30, errors);
  const builtUp = readMeasure(record, "builtUp", 1_000_000, errors);
  const landSize = readMeasure(record, "landSize", 100_000_000, errors);
  const tenure = readTenure(record.tenure, errors);
  const images = readImages(record.images, errors);
  const description = readDescription(record.description, errors);
  const solicitorId = readSolicitorId(record, errors);
  const metadata = readMetadata(record.metadata, errors);

  if (errors.length > 0) {
    return { ok: false, errors: errors.map((error) => withIndex(index, error)) };
  }

  return {
    ok: true,
    value: {
      title: title || autoTitle(propertyType, bedrooms, location),
      price: price as number,
      currency,
      location,
      propertyType,
      bedrooms,
      bathrooms,
      builtUp,
      landSize,
      tenure,
      images: images ?? [],
      description,
      contactType: contactType as ContactType,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      contactEmail: contactEmail || null,
      source,
      solicitorId,
      agentId,
      metadata,
    },
  };
}

export function validatePropertyBatch(
  input: unknown,
  options: Omit<ValidatePropertyOptions, "index"> & { bulk?: boolean } = {},
): ValidationSuccess<AplsProperty[]> | ValidationFailure {
  if (!Array.isArray(input)) {
    return {
      ok: false,
      errors: [{ field: "properties", message: "Add at least one listing." }],
    };
  }

  const count = input.length;
  if (options.bulk) {
    if (count < APLS.bulkMin || count > APLS.bulkMax) {
      return {
        ok: false,
        errors: [
          {
            field: "properties",
            message: `A bulk upload needs ${APLS.bulkMin} to ${APLS.bulkMax} listings.`,
          },
        ],
      };
    }
  } else if (count < 1 || count > APLS.batchMax) {
    return {
      ok: false,
      errors: [
        {
          field: "properties",
          message:
            count < 1
              ? "Add at least one listing."
              : `An upload can include at most ${APLS.batchMax} listings.`,
        },
      ],
    };
  }

  const properties: AplsProperty[] = [];
  const errors: FieldError[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const result = validateProperty(input[index], { ...options, index });
    if (result.ok) {
      properties.push(result.value);
    } else {
      errors.push(...result.errors);
      if (errors.length >= 40) break;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: properties };
}

const propertyTypePattern = /^[\p{L}][\p{L}\s-]{1,39}$/u;
const metadataKeyPattern = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const imageUrlPattern = /^https?:\/\/\S+$/;

function isBlank(value: unknown): boolean {
  return value == null || value === "";
}

function readCurrency(value: unknown, errors: FieldError[]): string | null {
  if (isBlank(value)) return null;
  const currency = readString(value).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.push({
      field: "currency",
      message: "Enter a 3-letter currency code.",
    });
    return null;
  }
  return currency;
}

function readPropertyType(value: unknown, errors: FieldError[]): string | null {
  if (isBlank(value)) return null;
  const propertyType = readString(value);
  if (!propertyTypePattern.test(propertyType)) {
    errors.push({
      field: "propertyType",
      message: "Enter a property type up to 40 characters.",
    });
    return null;
  }
  return propertyType;
}

function readMeasure(
  record: Record<string, unknown>,
  field: "bedrooms" | "bathrooms" | "builtUp" | "landSize",
  max: number,
  errors: FieldError[],
): number | null {
  if (!(field in record) || isBlank(record[field])) return null;
  const parsed = readInteger(record[field]);
  if (parsed == null || parsed < 0 || parsed > max) {
    errors.push({
      field,
      message: `Enter a whole number from 0 to ${max}.`,
    });
    return null;
  }
  return parsed;
}

// Freehold and Leasehold are written the same way everywhere; other local
// terms (Strata, Malay Reserve, 99-year lease…) are kept as given.
function readTenure(value: unknown, errors: FieldError[]): AplsTenure | null {
  if (isBlank(value)) return null;
  const tenure = readString(value);
  const lower = tenure.toLowerCase();
  if (lower === "freehold") return "Freehold";
  if (lower === "leasehold") return "Leasehold";
  if (tenure.length <= 40 && /^[\p{L}\p{N}][\p{L}\p{N}\s.'()\/-]*$/u.test(tenure)) return tenure;
  errors.push({
    field: "tenure",
    message: "Enter the tenure in up to 40 characters, for example Freehold.",
  });
  return null;
}

export function autoTitle(
  propertyType: string | null,
  bedrooms: number | null,
  location: string,
): string {
  const kind = (propertyType || "property").toLowerCase();
  const rooms = bedrooms && bedrooms > 0 ? `${bedrooms}-bedroom ` : "";
  const first = location.split(",")[0]?.trim();
  const place = first && !first.startsWith("Near ") ? first : "";
  const text = `${rooms}${kind}${place ? ` in ${place}` : ""}`;
  const title = text.charAt(0).toUpperCase() + text.slice(1);
  return title.slice(0, APLS.titleMax);
}

function readImages(value: unknown, errors: FieldError[]): string[] | null {
  if (isBlank(value)) return null;
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? [value]
      : null;
  if (!list || list.length < 1 || list.length > 12) {
    errors.push({
      field: "images",
      message: "Add between 1 and 12 image URLs.",
    });
    return null;
  }
  const images: string[] = [];
  for (const item of list) {
    const url = readString(item);
    if (!url || url.length > 300 || !imageUrlPattern.test(url)) {
      errors.push({
        field: "images",
        message: "Each image must be an http or https URL.",
      });
      return null;
    }
    images.push(url);
  }
  return images;
}

function readDescription(value: unknown, errors: FieldError[]): string | null {
  if (isBlank(value)) return null;
  const description = readString(value);
  if (!description || description.length > 2000) {
    errors.push({
      field: "description",
      message: "Enter a description up to 2000 characters.",
    });
    return null;
  }
  return description;
}

function readSolicitorId(
  record: Record<string, unknown>,
  errors: FieldError[],
): number | null {
  if (!("solicitorId" in record) || isBlank(record.solicitorId)) return null;
  const solicitorId = readInteger(record.solicitorId);
  if (solicitorId == null || solicitorId < 1) {
    errors.push({
      field: "solicitorId",
      message: "Choose a solicitor.",
    });
    return null;
  }
  return solicitorId;
}

function readMetadata(value: unknown, errors: FieldError[]): AplsMetadata | null {
  if (isBlank(value)) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push({
      field: "metadata",
      message: "Metadata must be an object.",
    });
    return null;
  }
  const metadata: AplsMetadata = {};
  for (const [key, entry] of Object.entries(value)) {
    const validEntry =
      entry == null ||
      typeof entry === "boolean" ||
      (typeof entry === "number" && Number.isFinite(entry)) ||
      (typeof entry === "string" && entry.length <= 200);
    if (!metadataKeyPattern.test(key) || !validEntry) {
      errors.push({
        field: "metadata",
        message: "Metadata keys and values must be short plain values.",
      });
      return null;
    }
    metadata[key] = entry as string | number | boolean | null;
  }
  if (JSON.stringify(metadata).length > 2000) {
    errors.push({
      field: "metadata",
      message: "Metadata must stay within 2000 characters.",
    });
    return null;
  }
  return metadata;
}

function isPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "").length;
  return (
    value.length <= APLS.phoneMax &&
    digits >= APLS.phoneMinDigits &&
    phonePattern.test(value)
  );
}
