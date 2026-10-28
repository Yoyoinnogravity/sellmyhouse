import { NextResponse } from "next/server";

// The short private link sellers keep: /edit/123/Xk3pQ9aB2mZt.
// It forwards to the edit page with the key in the #fragment, where the
// page reads it and takes it out of the address bar.
export async function GET(request: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params;
  if (!/^\d{1,10}$/.test(id) || !/^[A-Za-z0-9_-]{10,100}$/.test(key)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const response = NextResponse.redirect(new URL(`/property/${id}/manage#key=${key}`, request.url));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
