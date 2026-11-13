import { notFound } from "next/navigation";
import { requireCmsSession } from "@/app/api/_handlers/auth";
import { cmsJson, withCmsRequest } from "@/app/api/_handlers/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: none
export async function GET(
  request: Request,
  context: RouteContext<"/api/cms/nopermission/options/[module]">,
) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers);
    const { module } = await context.params;
    if (module !== "roles") notFound();

    return cmsJson(
      await prisma.cmsRole.findMany({
        where: { isSystem: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    );
  });
}
