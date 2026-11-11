import { NextResponse } from "next/server";
import { verifyClientEmail } from "@/lib/clientVerification";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = new URL("/", process.env.NEXT_PUBLIC_APP_URL || request.url);
  try {
    await verifyClientEmail(url.searchParams.get("token") || "");
    destination.searchParams.set("verification", "success");
  } catch {
    destination.searchParams.set("verification", "invalid");
  }
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
