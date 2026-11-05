import {
  assertModerationPermission,
  assertPublicationConfirmed,
  countNonValidPublications,
  submissionModerationData,
} from "@/app/api/_shared";
import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/handlers/auth";
import {
  cmsJson,
  CmsHttpError,
  parseBody,
  withCmsRequest,
} from "@/handlers/http";
import { submissionBulkSchema } from "@/services/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: submission.updateSubmissionStatus / submission.updateSubmissionValidity, checked per changed field
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    const actor = await requireCmsSession(request.headers);
    const { ids: input, ...data } = await parseBody(
      request,
      submissionBulkSchema,
    );
    const ids = [...new Set(input)];
    assertModerationPermission(actor, data);
    await prisma.$transaction(
      async (tx) => {
        const rows = await tx.submission.findMany({
          where: { id: { in: ids } },
          select: { status: true, validity: true },
        });
        if (rows.length !== ids.length)
          throw new CmsHttpError(409, "errors.conflict");
        // Không cập nhật một phần nếu còn bài cần xác nhận hoặc ID đã bị xóa.
        assertPublicationConfirmed(
          countNonValidPublications(rows, data),
          data.confirmPublish,
        );
        await tx.submission.updateMany({
          where: { id: { in: ids } },
          data: submissionModerationData(data, actor.name),
        });
      },
      { isolationLevel: "Serializable" },
    );
    return cmsJson({ ok: true });
  });
}
