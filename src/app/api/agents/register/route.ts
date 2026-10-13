import { NextResponse } from "next/server";
import {
  AgentError,
  createAgentAccount,
  formatAgentErrors,
  generateAgentToken,
  setAgentCookie,
  validateAgentRegistration,
} from "@/lib/agent";

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

  const validated = validateAgentRegistration(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: formatAgentErrors(validated.errors) },
      { status: 400 },
    );
  }

  try {
    const agent = await createAgentAccount(validated.value);
    const token = generateAgentToken(agent);
    const response = NextResponse.json({ agent }, { status: 201 });
    setAgentCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof AgentError) {
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
