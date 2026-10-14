import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { storageClient, storageEnabled } from "@/lib/objectStorage";

export const instant = false;

type Status = {
  postgres: string;
  functions: string;
  storage: string;
  auth: string;
};

export async function GET() {
  const status: Status = {
    postgres: "not checked",
    functions: "not checked",
    storage: "not checked",
    auth: "not checked",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    const properties = await prisma.property.count();
    status.postgres = `ok (${properties} properties)`;
  } catch (error) {
    status.postgres = `error: ${error instanceof Error ? error.message.slice(0, 160) : "unknown"}`;
  }

  const helloUrl = process.env.NEON_FUNCTION_HELLO_BASE_URL;
  if (!helloUrl) {
    status.functions = "error: NEON_FUNCTION_HELLO_BASE_URL is not set";
  } else {
    try {
      const response = await fetch(helloUrl, { cache: "no-store" });
      const text = await response.text();
      status.functions =
        response.ok && text.includes("Hello from Neon Functions")
          ? `ok (${helloUrl})`
          : `error: unexpected response ${response.status}`;
    } catch (error) {
      status.functions = `error: ${error instanceof Error ? error.message.slice(0, 160) : "unknown"}`;
    }
  }

  if (!storageEnabled()) {
    status.storage = "error: storage env vars are missing";
  } else {
    try {
      await storageClient().send(
        new HeadBucketCommand({ Bucket: process.env.NEON_ASSETS_BUCKET ?? "assets" }),
      );
      status.storage = "ok (assets bucket reachable)";
    } catch (error) {
      status.storage = `error: ${error instanceof Error ? error.message.slice(0, 160) : "unknown"}`;
    }
  }

  const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
  if (!jwksUrl) {
    status.auth = "error: NEON_AUTH_JWKS_URL is not set";
  } else {
    try {
      const response = await fetch(jwksUrl, { cache: "no-store" });
      const data = (await response.json()) as { keys?: unknown[] };
      status.auth =
        response.ok && Array.isArray(data.keys)
          ? `ok (JWKS reachable, ${data.keys.length} keys)`
          : `error: unexpected response ${response.status}`;
    } catch (error) {
      status.auth = `error: ${error instanceof Error ? error.message.slice(0, 160) : "unknown"}`;
    }
  }

  return Response.json(status);
}
