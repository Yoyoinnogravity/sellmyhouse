import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { siteFromHost, type SiteId } from "@/lib/site";

const shortNames: Record<SiteId, string> = {
  house: "SellMyHouse",
  condo: "SellMyCondo",
  land: "SellMyLand",
  bungalow: "SellMyBungalow",
};

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headerStore = await headers();
  const site = siteFromHost(headerStore.get("host"));
  return {
    id: "/",
    name: site.name,
    short_name: shortNames[site.id],
    description: `Listing your ${site.noun} for sale is free. No account needed to buy.`,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
