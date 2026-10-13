import { NextResponse } from "next/server";
import {
  SolicitorError,
  createSolicitorAccount,
  validateSolicitorRegistration,
} from "@/lib/solicitor";

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

  const validated = validateSolicitorRegistration(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const solicitor = await createSolicitorAccount(validated.value);
    return NextResponse.json({ solicitor }, { status: 201 });
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
