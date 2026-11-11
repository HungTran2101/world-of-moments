import "server-only";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ClientHttpError } from "@/lib/clientErrors";

function trustedPublicOrigin(request: Request) {
  // Đọc cấu hình runtime trên server, tránh Next.js đóng băng URL public từ lúc build.
  const expected = new URL(process.env.SUBMISSION_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
  return request.headers.get("origin") === expected && request.headers.get("sec-fetch-site") !== "cross-site";
}


export const CLIENT_PRIVATE_HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export function clientJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CLIENT_PRIVATE_HEADERS });
}
export async function withClientRequest(request: Request, action: () => Promise<Response>) {
  try {
    if (!["GET", "HEAD"].includes(request.method) && !trustedPublicOrigin(request)) {
      throw new ClientHttpError(403, "forbidden");
    }
    return await action();
  } catch (error) {
    if (error instanceof ClientHttpError) return clientJson({ code: error.code }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return clientJson({ code: "validation" }, 422);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return clientJson({ code: "emailExists" }, 409);
    }
    // Không trả lỗi DB hoặc thông tin xác thực về trình duyệt.
    console.error("Client request failed", error instanceof Error ? error.name : "Unknown error");
    return clientJson({ code: "unavailable" }, 503);
  }
}
