import { connection } from "next/server";
import { listSolicitors } from "@/lib/solicitor";

export async function GET(request: Request) {
  await connection();

  const params = new URL(request.url).searchParams;
  const location =
    params.get("country")?.trim() || params.get("city")?.trim() || "";
  const solicitors = await listSolicitors(location);

  return Response.json({ solicitors });
}
