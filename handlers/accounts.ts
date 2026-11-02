import "server-only";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/services/permission";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CmsAccountRecord } from "@/services/cms/accounts/types";
import {
  accountCreateSchema,
  accountUpdateSchema,
  deleteSchema,
  listSchema,
  resetPasswordSchema,
} from "@/services/schemas";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, CmsHttpError, parseBody } from "@/handlers/http";
import type { Prisma } from "@prisma/client";

const accountSelect = {
  id: true,
  username: true,
  name: true,
  isActive: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
} satisfies Prisma.UserSelect;

function serializeAccount(
  user: Prisma.UserGetPayload<{ select: typeof accountSelect }>,
) {
  const roles = user.roles.map(({ role }) => role);
  return {
    ...user,
    username: user.username ?? "",
    roles,
    roleIds: roles.map(({ id }) => id),
  };
}

async function assertRoles(tx: Prisma.TransactionClient, ids: string[]) {
  const count = await tx.cmsRole.count({
    where: { id: { in: [...new Set(ids)] }, isSystem: false },
  });
  if (count !== new Set(ids).size)
    throw new CmsHttpError(422, "errors.validation", {
      roleIds: ["validation.invalidRoles"],
    });
}

export async function handleAccounts(request: Request, parts: string[]) {
  const method = request.method;
  const id = parts[0];
  if (method === "GET") {
    if (parts.length > 1) throw new CmsHttpError(404, "errors.notFound");
    await requireCmsSession(request.headers, permissions.ACCOUNT_SHOW);
    if (id === "options") {
      return cmsJson(
        await prisma.cmsRole.findMany({
          where: { isSystem: false },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      );
    }
    if (id) {
      const user = await prisma.user.findFirst({
        where: { id, isSystem: false },
        select: accountSelect,
      });
      if (!user) throw new CmsHttpError(404, "errors.notFound");
      return cmsJson(serializeAccount(user));
    }
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
  }

  if (method === "POST" && id === "bulk-delete") {
    await requireCmsSession(request.headers, permissions.ACCOUNT_DELETE);
    const { ids: input } = await parseBody(request, deleteSchema);
    const ids = [...new Set(input)];
    await prisma.$transaction(
      async (tx) => {
        const count = await tx.user.count({
          where: { id: { in: ids }, isSystem: false },
        });
        if (count !== ids.length)
          throw new CmsHttpError(404, "errors.notFound");
        await tx.user.deleteMany({
          where: { id: { in: ids }, isSystem: false },
        });
      },
      { isolationLevel: "Serializable" },
    );
    return cmsJson({ ok: true });
  }

  if (method === "POST" && id && parts[1] === "reset-password") {
    await requireCmsSession(
      request.headers,
      permissions.ACCOUNT_RESET_PASSWORD,
    );
    const body = await parseBody(request, resetPasswordSchema);
    const password = await hashPassword(body.newPassword);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id, isSystem: false },
        select: { id: true },
      });
      if (!user) throw new CmsHttpError(404, "errors.notFound");
      await tx.account.updateMany({
        where: { userId: id, providerId: "credential" },
        data: { password },
      });
      await tx.session.deleteMany({ where: { userId: id } });
    });
    return cmsJson({ ok: true });
  }

  if (method === "POST" && !id) {
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
  }

  if (method === "PATCH" && id && parts.length === 1) {
    await requireCmsSession(request.headers, permissions.ACCOUNT_UPDATE);
    const { roleIds, ...data } = await parseBody(request, accountUpdateSchema);
    const user = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.user.findFirst({
          where: { id, isSystem: false },
          select: { id: true },
        });
        if (!existing) throw new CmsHttpError(404, "errors.notFound");
        await assertRoles(tx, roleIds);
        await tx.cmsUserRole.deleteMany({ where: { userId: id } });
        if (!data.isActive)
          await tx.session.deleteMany({ where: { userId: id } });
        return tx.user.update({
          where: { id },
          data: {
            ...data,
            displayUsername: data.username,
            roles: {
              create: [...new Set(roleIds)].map((roleId) => ({ roleId })),
            },
          },
          select: accountSelect,
        });
      },
      { isolationLevel: "Serializable" },
    );
    return cmsJson(serializeAccount(user));
  }
  throw new CmsHttpError(404, "errors.notFound");
}
