import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AUTH_COOKIE, verifyToken, type AuthUser } from "@/lib/auth";
import { safeNext } from "@/lib/safeNext";

export async function getUserFromCookie(): Promise<AuthUser | null> {
  await connection();
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function requireUser(returnPath = "/dashboard"): Promise<AuthUser> {
  const user = await getUserFromCookie();
  if (!user) {
    const nextPath = safeNext(returnPath, "/dashboard");
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}
