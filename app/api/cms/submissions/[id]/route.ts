import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/handlers/auth";
import {
  cmsJson,
  CmsHttpError,
  parseBody,
  withCmsRequest,
} from "@/handlers/http";
import { permissions } from "@/services/permission";
import { submissionUpdateSchema } from "@/services/schemas";
import {
  assertModerationPermission,
  assertPublicationConfirmed,
  countNonValidPublications,
  submissionModerationData,
  serializeSubmission,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: submission.show
export async function GET(
  request: Request,
  context: RouteContext<"/api/cms/submissions/[id]">,
) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.SUBMISSION_SHOW);
    const { id } = await context.params;
    const row = await prisma.submission.findUnique({ where: { id } });
    if (!row) throw new CmsHttpError(404, "errors.notFound");
    return cmsJson(serializeSubmission(row));
  });
}

// Login required - Permission: submission.updateSubmissionStatus / submission.updateSubmissionValidity, checked per changed field
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/cms/submissions/[id]">,
) {
  return withCmsRequest(request, async () => {
    const actor = await requireCmsSession(request.headers);
    const { id } = await context.params;
    const data = await parseBody(request, submissionUpdateSchema);
    assertModerationPermission(actor, data);
    const row = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.submission.findUnique({ where: { id } });
        if (!existing) throw new CmsHttpError(404, "errors.notFound");
        // Đọc trạng thái và cập nhật trong cùng transaction để cảnh báo không dựa vào dữ liệu cũ của UI.
        assertPublicationConfirmed(
          countNonValidPublications([existing], data),
          data.confirmPublish,
        );
        return tx.submission.update({
          where: { id },
          data: submissionModerationData(data, actor.name),
        });
      },
      { isolationLevel: "Serializable" },
    );
    return cmsJson(serializeSubmission(row));
  });
}
