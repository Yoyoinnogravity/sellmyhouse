import { NextResponse } from "next/server";
import {
  AgentError,
  authenticateAgent,
  generateAgentToken,
  setAgentCookie,
} from "@/lib/agent";
import { AuthError, parseCredentials } from "@/lib/auth";

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

  const record =
    body && typeof body === "object"
      ? (body as { email?: unknown; password?: unknown })
      : {};

  try {
    const credentials = parseCredentials({
      email: record.email,
      password: record.password,
    });
    const agent = await authenticateAgent(
      credentials.email,
      credentials.password,
    );
    const token = generateAgentToken(agent);
    const response = NextResponse.json({
      agent: { id: agent.id, name: agent.name, email: agent.email },
    });
    setAgentCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof AgentError || error instanceof AuthError) {
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
