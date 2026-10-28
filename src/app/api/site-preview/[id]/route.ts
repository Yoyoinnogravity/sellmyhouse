import { NextResponse } from "next/server";
import { publishedContact } from "@/lib/developerContact";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/queryCache";

// The preview picture a developer's or agency's website publishes for link
// sharing (its og:image), shown as a link card back to their site. We link
// to the picture on their server; nothing is copied to ours.
// Only the website stored on the listing is ever fetched.

function listingWebsite(metadata: string | null): string | null {
  const website = publishedContact(metadata).website;
  if (website) return website;
  try {
    const parsed = metadata ? (JSON.parse(metadata) as { listingUrl?: unknown }) : {};
    return typeof parsed.listingUrl === "string" && /^https?:\/\//i.test(parsed.listingUrl) ? parsed.listingUrl : null;
  } catch {
    return null;
  }
}

function publicHost(url: URL) {
  const host = url.hostname.toLowerCase();
  return !(
    host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host) || host.includes(":")
  );
}

function meta(html: string, names: string[]): string | null {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      "i",
    );
    const match = pattern.exec(html);
    if (match) return (match[1] ?? match[2]).trim();
  }
  return null;
}

async function preview(website: string) {
  const url = new URL(website);
  if (!/^https?:$/.test(url.protocol) || !publicHost(url)) return null;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SellMyHouseBot/1.0; +https://sellmyhouse.asia)", Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) return null;
  const html = (await response.text()).slice(0, 400_000);
  const image = meta(html, ["og:image", "og:image:url", "twitter:image"]);
  const title = meta(html, ["og:site_name", "og:title"]) ?? /<title[^>]*>([^<]{1,120})/i.exec(html)?.[1]?.trim() ?? null;
  let imageUrl: string | null = null;
  if (image) {
    try {
      const absolute = new URL(image, response.url);
      if (/^https?:$/.test(absolute.protocol)) imageUrl = absolute.toString();
    } catch {
      imageUrl = null;
    }
  }
  return { website, host: url.hostname.replace(/^www\./, ""), title, image: imageUrl };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json(null, { status: 404 });
  const property = await prisma.property.findUnique({ where: { id }, select: { metadata: true } });
  const website = property ? listingWebsite(property.metadata) : null;
  if (!website) return NextResponse.json(null);
  try {
    const result = await cached(`site-preview:${website}`, () => preview(website));
    return NextResponse.json(result, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
  } catch {
    return NextResponse.json({ website, host: new URL(website).hostname.replace(/^www\./, ""), title: null, image: null });
  }
}
