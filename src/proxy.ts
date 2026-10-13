import { NextResponse, type NextRequest } from "next/server";
import { AGENT_COOKIE, verifyAgentToken } from "@/lib/agent";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

function isProtectedPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/properties/manage" ||
    pathname.startsWith("/properties/manage/")
  );
}

function isAgentDashboard(pathname: string) {
  return (
    pathname === "/agents/dashboard" ||
    pathname.startsWith("/agents/dashboard/")
  );
}

export function proxy(request: NextRequest) {
  if (isAgentDashboard(request.nextUrl.pathname)) {
    const token = request.cookies.get(AGENT_COOKIE)?.value;
    if (!token || !verifyAgentToken(token)) {
      return NextResponse.redirect(new URL("/agents/login", request.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/properties/manage",
    "/properties/manage/:path*",
    "/agents/dashboard",
    "/agents/dashboard/:path*",
  ],
};
