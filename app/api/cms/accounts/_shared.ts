import "server-only";

import type { Prisma } from "@prisma/client";
import { CmsHttpError } from "@/handlers/http";

export const accountSelect = {
  id: true,
  username: true,
  name: true,
  isActive: true,
  roles: { select: { role: { select: { id: true, name: true } } } },
} satisfies Prisma.UserSelect;

export function serializeAccount(
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

export async function assertRoles(tx: Prisma.TransactionClient, ids: string[]) {
  const count = await tx.cmsRole.count({
    where: { id: { in: [...new Set(ids)] }, isSystem: false },
  });
  if (count !== new Set(ids).size)
    throw new CmsHttpError(422, "errors.validation", {
      roleIds: ["validation.invalidRoles"],
    });
}
