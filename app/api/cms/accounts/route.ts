import { prisma } from "@/lib/prisma";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, parseBody, withCmsRequest } from "@/handlers/http";
import { permissions } from "@/services/permission";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Prisma } from "@prisma/client";
import { accountCreateSchema, listSchema } from "@/services/schemas";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CmsAccountRecord } from "@/services/cms/accounts/types";
import { accountSelect, serializeAccount, assertRoles } from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: account.show
export async function GET(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.ACCOUNT_SHOW);
    const params = await listSchema.validate(
      Object.fromEntries(new URL(request.url).searchParams),
      { abortEarly: false, stripUnknown: true },
    );
    const where: Prisma.UserWhereInput = {
      isSystem: false,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { username: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const result = await prisma.$transaction(
      async (tx) => {
        // Lọc tài khoản hệ thống cả khi đếm để phân trang không tiết lộ admin ẩn.
        const total = await tx.user.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
        const page = Math.min(params.page, totalPages);
        const users = await tx.user.findMany({
          where,
          select: accountSelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * params.pageSize,
          take: params.pageSize,
        });
        return {
          items: users.map(serializeAccount),
          metadata: { page, pageSize: params.pageSize, total, totalPages },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
    return cmsJson(result satisfies PaginatedResponse<CmsAccountRecord>);
  });
}

// Login required - Permission: account.create
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.ACCOUNT_CREATE);
    const {
      password: plain,
      roleIds,
      ...data
    } = await parseBody(request, accountCreateSchema);
    const password = await hashPassword(plain);
    const userId = randomUUID();
    const user = await prisma.$transaction(async (tx) => {
      await assertRoles(tx, roleIds);
      return tx.user.create({
        data: {
          ...data,
          id: userId,
          email: `${userId}@cms.invalid`,
          emailVerified: true,
          displayUsername: data.username,
          accounts: {
            create: { accountId: userId, providerId: "credential", password },
          },
          roles: {
            create: [...new Set(roleIds)].map((roleId) => ({ roleId })),
          },
        },
        select: accountSelect,
      });
    });
    return cmsJson(serializeAccount(user), 201);
  });
}
