import bcrypt from "bcrypt";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const AUTH_COOKIE = "token";

const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthUser = {
  id: number;
  email: string;
};

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AuthError("Server auth is not configured.", 500);
  }
  return secret;
}

export function parseCredentials(input: {
  email: unknown;
  password: unknown;
}): { email: string; password: string } {
  if (typeof input.email !== "string" || typeof input.password !== "string") {
    throw new AuthError("Email and password are required.", 400);
  }

  const email = input.email.trim().toLowerCase();
  if (!emailPattern.test(email)) {
    throw new AuthError("Enter a valid email address.", 400);
  }

  if (input.password.length < 8) {
    throw new AuthError("Password must be at least 8 characters.", 400);
  }

  return { email, password: input.password };
}

export async function registerUser(
  email: string,
  password: string,
): Promise<AuthUser> {
  const credentials = parseCredentials({ email, password });
  const passwordHash = await bcrypt.hash(credentials.password, 12);

  try {
    return await prisma.user.create({
      data: {
        email: credentials.email,
        password: passwordHash,
      },
      select: {
        id: true,
        email: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AuthError("An account with that email already exists.", 409);
    }
    throw error;
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthUser> {
  const credentials = parseCredentials({ email, password });
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
  });

  if (!user) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(
    credentials.password,
    user.password,
  );
  if (!passwordMatches) {
    throw new AuthError("Invalid email or password.", 401);
  }

  return {
    id: user.id,
    email: user.email,
  };
}

export function generateToken(user: AuthUser) {
  return jwt.sign({ email: user.email }, getJwtSecret(), {
    subject: String(user.id),
    expiresIn: TOKEN_MAX_AGE_SECONDS,
  });
}

export function verifyToken(token: string): AuthUser | null {
  const secret = getJwtSecret();

  try {
    const payload = jwt.verify(token, secret);
    if (typeof payload === "string") {
      return null;
    }

    const claims = payload as JwtPayload;
    if (typeof claims.sub !== "string" || typeof claims.email !== "string") {
      return null;
    }

    const id = Number(claims.sub);
    if (!Number.isInteger(id)) {
      return null;
    }

    return {
      id,
      email: claims.email,
    };
  } catch {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}
