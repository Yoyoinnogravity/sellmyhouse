import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";

export type SiteId = "house" | "condo" | "land" | "bungalow";

export type Site = {
  id: SiteId;
  name: string;
  host: string;
  noun: string;
  withArticle: string;
  plural: string;
  mapHeading: string;
};

const houseTypes = [
  "Rumah Teres",
  "Rumah Berkembar",
  "Rumah Bandar",
  "Rumah Kluster",
  "Rumah Kedai G",
  "Rumah Kedai H",
  "House",
  "Townhouse",
  "Terrace",
  "Semi-detached",
  "Cottage",
  "Victorian",
  "Tenement",
  "Machiya",
  "Craftsman",
  "Brownstone",
];

const condoTypes = [
  "Rumah Pangsa Kondo",
  "Pangsapuri Servis",
  "Pangsapuri Suite",
  "Apartment",
  "Condominium",
  "Soho",
  "Suite Homes",
  "Walk-up",
  "Flat",
  "Studio",
];

const bungalowTypes = [
  "Bungalow",
  "Rumah Sesebuah",
  "Rumah Berpagar",
  "Rumah Berpagar Berpengawal",
  "Detached",
  "Villa",
];

export const sites: Record<SiteId, Site> = {
  house: {
    id: "house",
    name: "Sell My House",
    host: "sellmyhouse.asia",
    noun: "house",
    withArticle: "a house",
    plural: "houses",
    mapHeading: "Houses on the map",
  },
  condo: {
    id: "condo",
    name: "Sell My Condo",
    host: "sellmycondo.asia",
    noun: "condo",
    withArticle: "a condo",
    plural: "condos",
    mapHeading: "Condos on the map",
  },
  land: {
    id: "land",
    name: "Sell My Land",
    host: "sellmyland.asia",
    noun: "land",
    withArticle: "land",
    plural: "plots",
    mapHeading: "Land on the map",
  },
  bungalow: {
    id: "bungalow",
    name: "Sell My Bungalow",
    host: "sellmybungalow.asia",
    noun: "bungalow",
    withArticle: "a bungalow",
    plural: "bungalows",
    mapHeading: "Bungalows on the map",
  },
};

export function siteFromHost(host: string | null): Site {
  const name = (host ?? "")
    .split(":")[0]
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  if (name === sites.condo.host) return sites.condo;
  if (name === sites.land.host) return sites.land;
  if (name === sites.bungalow.host) return sites.bungalow;
  return sites.house;
}

export async function currentSite() {
  const headerStore = await headers();
  return siteFromHost(headerStore.get("host"));
}

export function siteListingWhere(site: Site): Prisma.PropertyWhereInput {
  if (site.id === "land") {
    return {
      OR: [
        { propertyType: { contains: "Tanah" } },
        { propertyType: { contains: "Land" } },
        { title: { contains: "Tanah" } },
      ],
    };
  }
  if (site.id === "condo") return { propertyType: { in: condoTypes } };
  if (site.id === "bungalow") return { propertyType: { in: bungalowTypes } };
  return {
    OR: [{ propertyType: { in: houseTypes } }, { propertyType: null }],
  };
}
