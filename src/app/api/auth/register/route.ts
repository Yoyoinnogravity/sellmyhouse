import { NextResponse } from "next/server";
import {
  AuthError,
  generateToken,
  parseCredentials,
  registerUser,
  setAuthCookie,
} from "@/lib/auth";

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
    const user = await registerUser(credentials.email, credentials.password);
    const token = generateToken(user);
    const response = NextResponse.json({ user });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
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
