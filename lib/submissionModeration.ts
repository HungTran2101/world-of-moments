import "server-only";

import type {
  Prisma,
  SubmissionValidity as DatabaseValidity,
} from "@prisma/client";
import { z } from "zod";
import type { SubmissionValidity } from "@/services/submissions/constants";

export const toDatabaseValidity = (
  value: SubmissionValidity,
): DatabaseValidity => (value === "need-inspect" ? "need_inspect" : value);
export const serializeValidity = (
  value: DatabaseValidity,
): SubmissionValidity => (value === "need_inspect" ? "need-inspect" : value);

export function submissionViewer(request: Request): string | undefined {
  const parsed = z.uuid().safeParse(request.headers.get("x-author-uuid"));
  return parsed.success ? parsed.data : undefined;
}

export function visibleSubmissionWhere(
  authorUuid?: string,
): Prisma.SubmissionWhereInput {
  // Chủ bài được xem bài đã công bố dù chưa hợp lệ; bài ẩn không xuất hiện trên bản đồ.
  return {
    status: "published",
    OR: [
      { validity: "valid" },
      ...(authorUuid ? [{ author_uuid: authorUuid }] : []),
    ],
  };
}

export const SUBMISSION_PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Accept-Encoding, x-author-uuid",
};
