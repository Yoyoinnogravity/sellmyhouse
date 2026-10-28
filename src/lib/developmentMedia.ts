import { prisma } from "@/lib/prisma";
import { developmentName, openWebsite, readSite } from "@/lib/developmentMediaCrawl";

// Adds developer photos and videos to imported developments, a few projects
// per run. Each project is checked once (mediaChecked) and credited to the
// site the pictures came from (mediaSource). Sites whose robots.txt blocks
// all crawlers are skipped. A developer can ask for removal via /advertise;
// set metadata.mediaOptOut = 1 to keep a project's pictures off for good.

type Row = { code: string; website: string; title: string; propertyType: string | null };

async function robotsAllow(website: string): Promise<boolean> {
  try {
    const origin = new URL(website).origin;
    const response = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return true;
    const text = (await response.text()).slice(0, 50_000);
    let applies = false;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/#.*/, "").trim();
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (/^user-agent$/i.test(key)) applies = value === "*" || /sellmyhouse/i.test(value);
      else if (applies && /^disallow$/i.test(key) && value === "/") return false;
    }
    return true;
  } catch {
    return true;
  }
}

async function save(code: string, website: string, images: string[], videos: string[]) {
  const imageList = images.length > 0 ? JSON.stringify(images) : null;
  await prisma.$executeRaw`
    UPDATE "Property"
    SET image = COALESCE(${images[0] ?? null}, image),
        images = COALESCE(${imageList}, images),
        metadata = (metadata::jsonb || jsonb_build_object(
          'videos', ${JSON.stringify(videos)}::jsonb,
          'mediaChecked', 1,
          'mediaSource', ${website}::text))::text
    WHERE metadata::jsonb->>'projectCode' = ${code}
      AND metadata::jsonb->>'register' = 'TEDUH'`;
}

export async function fillDevelopmentMedia(options: { deadlineMs?: number; maxProjects?: number } = {}) {
  const deadline = Date.now() + (options.deadlineMs ?? 40_000);
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT metadata::jsonb->>'projectCode' AS code,
           min(metadata::jsonb->>'website') AS website,
           min(title) AS title,
           min("propertyType") AS "propertyType"
    FROM "Property"
    WHERE metadata IS NOT NULL
      AND metadata::jsonb->>'register' = 'TEDUH'
      AND metadata::jsonb->>'mediaChecked' IS NULL
      AND metadata::jsonb->>'mediaOptOut' IS NULL
      AND coalesce(metadata::jsonb->>'website', '') <> ''
    GROUP BY 1
    LIMIT ${options.maxProjects ?? 3}`;

  const log: string[] = [];
  for (const row of rows) {
    if (Date.now() > deadline) break;
    const website = openWebsite(row.website);
    if (!website || !(await robotsAllow(website))) {
      await save(row.code, row.website, [], []);
      log.push(`${row.code}: skipped (${website ? "robots.txt" : "no website"})`);
      continue;
    }
    try {
      // The crawler expects the title without our " · type" suffix.
      const title = row.title.split(" · ")[0];
      const media = await readSite({ code: row.code, website, title, propertyType: row.propertyType });
      await save(row.code, website, media.images as string[], media.videos as string[]);
      log.push(`${row.code} ${developmentName(title, row.code, row.propertyType)}: ${media.images.length} photos, ${media.videos.length} videos`);
    } catch (error) {
      await save(row.code, website, [], []);
      log.push(`${row.code}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  return { checked: rows.length, log };
}
