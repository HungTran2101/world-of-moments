import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/app/api/_handlers/auth";
import { cmsJson, parseBody, withCmsRequest } from "@/app/api/_handlers/http";
import { permissions } from "@/services/permission";
import { clientUserCreateSchema, clientUserListSchema } from "@/services/schemas";
import { cleanupExpiredClients, createClientAccount, getClientRecord } from "@/lib/clientAccounts";
import { serializeClientUser } from "@/lib/clientUserSerialization";
import { sendClientVerification } from "@/lib/clientVerification";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CmsClientUserRecord } from "@/services/cms/client-users/types";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.CLIENT_USER_SHOW);
    const params = await clientUserListSchema.validate(
      Object.fromEntries(new URL(request.url).searchParams),
      { abortEarly: false },
    );
    await cleanupExpiredClients();
    // Làm hết hạn trạng thái trước khi lọc để danh sách và chi tiết thống nhất ngay cả khi không có phiên client.
    await prisma.user.updateMany({
      where: { kind: "client", clientStatus: "suspended", suspendedUntil: { lte: new Date() } },
      data: {
        clientStatus: "verified",
        suspendedUntil: null,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: null,
      },
    });
    const where: Prisma.UserWhereInput = {
      kind: "client",
      ...(params.status !== "all" ? { clientStatus: params.status } : {}),
      ...(params.search ? { email: { contains: params.search, mode: "insensitive" } } : {}),
    };
    const result = await prisma.$transaction(
      async (tx) => {
        const total = await tx.user.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
        const page = Math.min(params.page, totalPages);
        const records = await tx.user.findMany({
          where,
          include: { submissionLimit: true },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * params.pageSize,
          take: params.pageSize,
        });
        const actors = await tx.user.findMany({
          where: {
            kind: "cms",
            id: {
              in: records.flatMap((record) =>
                record.statusUpdatedBy ? [record.statusUpdatedBy] : [],
              ),
            },
          },
          select: { id: true, name: true },
        });
        return {
          items: records.map((record) =>
            serializeClientUser(
              record,
              actors.find((actor) => actor.id === record.statusUpdatedBy)?.name ?? null,
            ),
          ),
          metadata: { page, pageSize: params.pageSize, total, totalPages },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
    return cmsJson(result satisfies PaginatedResponse<CmsClientUserRecord>);
  });
}
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    const actor = await requireCmsSession(request.headers, permissions.CLIENT_USER_CREATE);
    const body = await parseBody(request, clientUserCreateSchema);
    if (body.status !== "unverified")
      await requireCmsSession(request.headers, permissions.CLIENT_USER_CHANGE_STATUS);
    const user = await createClientAccount(body.email, body.password, body.status, actor.id);
    let emailError = false;
    if (body.status === "unverified") {
      try {
        await sendClientVerification(
          user.id,
          request.headers.get("cookie")?.includes("locale=en") ? "en" : "vi",
        );
      } catch {
        emailError = true;
      }
    }
    const current = await getClientRecord(user.id);
    return cmsJson({ ...serializeClientUser(current!, actor.name), emailError }, 201);
  });
}
