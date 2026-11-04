import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/handlers/auth";
import {
  cmsJson,
  CmsHttpError,
  parseBody,
  withCmsRequest,
} from "@/handlers/http";
import { permissions } from "@/services/permission";
import { deleteSchema } from "@/services/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: submission.delete
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.SUBMISSION_DELETE);
    const { ids: input } = await parseBody(request, deleteSchema);
    const ids = [...new Set(input)];
    await prisma.$transaction(
      async (tx) => {
        const count = await tx.submission.count({ where: { id: { in: ids } } });
        if (count !== ids.length)
          throw new CmsHttpError(409, "errors.conflict");
        await tx.submission.deleteMany({ where: { id: { in: ids } } });
      },
      { isolationLevel: "Serializable" },
    );
    return cmsJson({ ok: true });
  });
}
