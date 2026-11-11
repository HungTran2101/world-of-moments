import { prisma } from "@/lib/prisma";
import type { PaginatedResponse } from "@/services/shared/pagination";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { submissionViewer } from "@/lib/submissionModeration";
import { clientJson } from "@/app/api/_handlers/clientHttp";

const PAGE_SIZE = 10;
const HistorySchema = z.object({
  search: z.string().trim().max(600).default(""),
  page: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
});
const headers = {
  "Cache-Control": "private, no-store",
};
export async function GET(request: NextRequest) {
  const authorUuid = await submissionViewer(request);
  if (!authorUuid) return clientJson({ code: "unauthorized" }, 401);
  const parsed = HistorySchema.safeParse({
    search: request.nextUrl.searchParams.get("search") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Valid search and page are required",
      },
      {
        status: 400,
        headers,
      },
    );
  }
  const { search, page: requestedPage } = parsed.data;
  try {
    // Đếm và lấy trang cùng bộ lọc tài khoản/từ khóa; luôn giữ một trang cho trạng thái rỗng.
    const where = {
      clientUserId: authorUuid,
      ...(search
        ? {
            description: {
              contains: search,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };
    const total = await prisma.submission.count({
      where,
    });
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    // Nếu dữ liệu đã giảm, trả về trang cuối còn tồn tại thay vì để người dùng mắc ở trang rỗng.
    const page = Math.min(requestedPage, totalPages);
    const items = await prisma.submission.findMany({
      where,
      orderBy: [
        {
          created_at: "desc",
        },
        {
          id: "desc",
        },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        description: true,
        lat: true,
        lng: true,
        weather_summary: true,
        weather_code: true,
        created_at: true,
        status: true,
      },
    });
    return NextResponse.json<PaginatedResponse<(typeof items)[number]>>(
      {
        items,
        metadata: {
          page,
          pageSize: PAGE_SIZE,
          total,
          totalPages,
        },
      },
      {
        headers,
      },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Failed to load history",
      },
      {
        status: 500,
        headers,
      },
    );
  }
}
