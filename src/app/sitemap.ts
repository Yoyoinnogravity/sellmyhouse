import type { MetadataRoute } from "next";
import { unstable_rethrow } from "next/navigation";
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
    { url: `${base}/properties`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/agents`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/agents/register`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/solicitors`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/developers`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/advertise`, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const where = siteListingWhere(site);
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
  } catch (error) {
    unstable_rethrow(error);
    // Without the database, search engines still get the main pages.
  }

  return pages;
}
