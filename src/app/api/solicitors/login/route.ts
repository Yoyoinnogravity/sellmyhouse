import { NextResponse } from "next/server";
import { SolicitorError, findSolicitorByEmail } from "@/lib/solicitor";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const email =
    body && typeof body === "object" && typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";

  try {
    const solicitor = await findSolicitorByEmail(email);
    return NextResponse.json({
      solicitor: {
        id: solicitor.id,
        name: solicitor.name,
        email: solicitor.email,
      },
    });
  } catch (error) {
    if (error instanceof SolicitorError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 },
    );
  }
}
