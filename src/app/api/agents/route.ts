import { connection } from "next/server";
import { listAgents } from "@/lib/agent";

export async function GET(request: Request) {
  await connection();

  const params = new URL(request.url).searchParams;
  const location =
    params.get("country")?.trim() || params.get("area")?.trim() || "";
  const agents = await listAgents(location);

  return Response.json({ agents });
}
