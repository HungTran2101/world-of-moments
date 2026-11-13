import {
  submissionViewer,
  visibleSubmissionWhere,
  SUBMISSION_PRIVATE_HEADERS,
} from "@/lib/submissionModeration";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/app/api/_handlers/clientAuth";
import { withClientRequest } from "@/app/api/_handlers/clientHttp";
import { readClient } from "@/lib/clientAccounts";
import { ClientHttpError } from "@/lib/clientErrors";
import { compressedJson } from "@/lib/compressedJson";

// GET /api/submissions/:id
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const { id } = await params;
  const submission = await prisma.submission.findFirst({
    where: {
      id,
      ...visibleSubmissionWhere(await submissionViewer(request)),
    },
    select: {
      id: true,
      // title: true,
      description: true,
      lat: true,
      lng: true,
      weather_summary: true,
      weather_code: true,
    },
  });
  if (!submission) {
    return NextResponse.json(
      {
        error: "Not found",
      },
      {
        status: 404,
        headers: SUBMISSION_PRIVATE_HEADERS,
      },
    );
  }
  return compressedJson(submission, request, SUBMISSION_PRIVATE_HEADERS);
}

// Không có PATCH: nội dung và tọa độ không thay đổi sau khi gửi.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withClientRequest(request, async () => {
    const user = await requireClientSession(request.headers);
    const { id } = await params;
    const removed = await prisma.$transaction(async (tx) => {
      const current = await readClient(tx, user.id);
      if (!current) return false;
      const result = await tx.submission.deleteMany({ where: { id, clientUserId: user.id } });
      return result.count > 0;
    });
    if (!removed) throw new ClientHttpError(404, "notFound");
    return new NextResponse(null, { status: 204, headers: SUBMISSION_PRIVATE_HEADERS });
  });
}
