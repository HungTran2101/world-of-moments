import { permissions } from "@/services/permission";
import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/app/api/_handlers/auth";
import { cmsJson, CmsHttpError, parseBody, withCmsRequest } from "@/app/api/_handlers/http";
import { deleteSchema } from "@/services/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: account.delete
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.ACCOUNT_DELETE);
    const { ids: input } = await parseBody(request, deleteSchema);
    const ids = [...new Set(input)];
    await prisma.$transaction(
      async (tx) => {
        const count = await tx.user.count({
          where: { id: { in: ids }, isSystem: false, kind: "cms" },
        });
        if (count !== ids.length) throw new CmsHttpError(404, "errors.notFound");
        await tx.user.deleteMany({
          where: { id: { in: ids }, isSystem: false, kind: "cms" },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return cmsJson({ ok: true });
  });
}
