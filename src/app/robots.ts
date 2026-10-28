import type { MetadataRoute } from "next";
import { currentSite } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await currentSite();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private or account-only pages: nothing for search engines here.
      disallow: ["/api/", "/dashboard", "/leads", "/agents/dashboard", "/properties/manage", "/property/*/manage", "/edit/"],
    },
    sitemap: `https://${site.host}/sitemap.xml`,
  };
}
