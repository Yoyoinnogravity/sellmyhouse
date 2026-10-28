import type { MetadataRoute } from "next";
import { unstable_rethrow } from "next/navigation";
import { areaSlug, KL_AREAS } from "@/lib/areas";
import { notRemovedWhere } from "@/lib/listingRemoval";
import { listTopPlaces } from "@/lib/mappedProperties";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/queryCache";
import { currentSite, siteListingWhere } from "@/lib/site";

// Tells search engines about every page on whichever brand is being served
// (sellmyhouse.asia, sellmycondo.asia, …), including each listing.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await currentSite();
  const base = `https://${site.host}`;
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/sell`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/listing-format`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/upload`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/properties`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/agents`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/agents/register`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/solicitors`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/developers`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/advertise`, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    // One brand: every listing, except hidden ones.
    void siteListingWhere(site);
    const where = notRemovedWhere;
    const listings = await cached(`sitemap:${site.id}`, () =>
      prisma.property.findMany({
        where,
        select: { id: true, createdAt: true },
        orderBy: { id: "desc" },
        take: 45000,
      }),
    );
    for (const listing of listings) {
      pages.push({
        url: `${base}/property/${listing.id}`,
        lastModified: listing.createdAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    // Area pages (/in/kuala-lumpur) for every place with a few listings.
    for (const place of await listTopPlaces(500)) {
      if (place.count < 2) continue;
      pages.push({ url: `${base}/in/${areaSlug(place.label)}`, changeFrequency: "daily", priority: 0.8 });
    }
    for (const area of KL_AREAS) {
      const url = `${base}/in/${areaSlug(area)}`;
      if (!pages.some((page) => page.url === url)) pages.push({ url, changeFrequency: "daily", priority: 0.8 });
    }
  } catch (error) {
    unstable_rethrow(error);
    // Without the database, search engines still get the main pages.
  }

  return pages;
}
