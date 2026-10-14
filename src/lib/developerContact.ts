export type PublishedContact = {
  developer: string | null
  phones: string[]
  whatsappNumber: string | null
  website: string | null
}

const emptyContact: PublishedContact = {
  developer: null,
  phones: [],
  whatsappNumber: null,
  website: null,
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function nationalDigits(value: string) {
  let digits = value.replace(/\D/g, "")
  if (digits.startsWith("60")) digits = digits.slice(2)
  return digits.replace(/^0/, "")
}

export function isMobile(value: string) {
  return /^1\d{8,9}$/.test(nationalDigits(value))
}

export function telHref(phone: string) {
  return `tel:+60${nationalDigits(phone)}`
}

export function whatsappHref(phone: string) {
  return `https://wa.me/60${nationalDigits(phone)}`
}

export function publishedContact(metadata: string | null): PublishedContact {
  if (!metadata) return emptyContact
  try {
    const parsed = JSON.parse(metadata) as {
      developer?: unknown
      phone?: unknown
      phone2?: unknown
      website?: unknown
    }
    const phones = [text(parsed.phone), text(parsed.phone2)].filter((phone): phone is string => Boolean(phone))
    const website = text(parsed.website)
    return {
      developer: text(parsed.developer),
      phones,
      whatsappNumber: phones.find(isMobile) ?? null,
      website: website && /^https?:\/\//i.test(website) ? website : null,
    }
  } catch {
    return emptyContact
  }
}
