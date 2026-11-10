import { NextRequest, NextResponse } from "next/server";
import { initializeVisitor, originDenied, trustedPublicOrigin } from "@/lib/submissionIdentity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  if (!trustedPublicOrigin(request)) return originDenied();
  try {
    return initializeVisitor(request);
  } catch {
    return NextResponse.json({
      error: "Identity temporarily unavailable"
    }, {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store"
      }
    });
  }
}
