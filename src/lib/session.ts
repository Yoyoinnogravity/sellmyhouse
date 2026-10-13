import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AUTH_COOKIE, verifyToken, type AuthUser } from "@/lib/auth";

export async function getUserFromCookie(): Promise<AuthUser | null> {
  await connection();
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getUserFromCookie();
  if (!user) {
    redirect("/login");
  }

  return user;
}
