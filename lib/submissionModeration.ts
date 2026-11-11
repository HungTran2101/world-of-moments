import "server-only";
import type { SubmissionValidity } from "@/services/constant";
import type { Prisma, SubmissionValidity as DatabaseValidity } from "@prisma/client";
import type { NextRequest } from "next/server";
import { getClientSession } from "@/app/api/_handlers/clientAuth";

export const toDatabaseValidity = (value: SubmissionValidity): DatabaseValidity =>
  value === "need-inspect" ? "need_inspect" : value;
export const serializeValidity = (value: DatabaseValidity): SubmissionValidity =>
  value === "need_inspect" ? "need-inspect" : value;
export async function submissionViewer(request: NextRequest): Promise<string | undefined> {
  return (await getClientSession(request.headers))?.id;
}

export function visibleSubmissionWhere(authorUuid?: string): Prisma.SubmissionWhereInput {
  // Chủ bài được xem bài đã công bố dù chưa hợp lệ; bài ẩn không xuất hiện trên bản đồ.
  return {
    status: "published",
    OR: [
      {
        validity: "valid",
      },
      ...(authorUuid
        ? [
            {
              clientUserId: authorUuid,
            },
          ]
        : []),
    ],
  };
}

export const SUBMISSION_PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Accept-Encoding, Cookie",
};
