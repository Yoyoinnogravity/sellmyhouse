import type { ContactType, PropertySource } from "@/lib/propertyStandard";

export type Property = {
  id: number;
  title: string;
  price: number;
  currency: string | null;
  location: string;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  builtUp: number | null;
  landSize: number | null;
  tenure: string | null;
  images: string | null;
  description: string | null;
  contactType: ContactType;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  source: PropertySource | null;
  agentId: number | null;
  solicitorId: number | null;
  metadata: string | null;
  createdAt: Date;
};
