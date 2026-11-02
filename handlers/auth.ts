import "server-only";

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { username } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/services/permission";
import { CmsHttpError } from "@/handlers/http";
import type { CmsUser } from "@/services/shared/types";

export async function getCmsIdentity(userId: string): Promise<CmsUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user?.isActive) throw new CmsHttpError(401, "errors.unauthorized");

  return {
    id: user.id,
    username: user.username ?? "",
    name: user.name,
    scopes: [...new Set(user.roles.flatMap(({ role }) => role.permissions))],
  };
}

let authInstance: ReturnType<typeof createAuth> | undefined;

function createAuth() {
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32
  ) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  const baseURL =
    process.env.CMS_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  return betterAuth({
    appName: "World of Moments CMS",
    baseURL,
    basePath: "/api/cms/auth",
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
      transaction: true,
    }),
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { isActive: true },
            });
            if (!user?.isActive)
              throw new APIError("UNAUTHORIZED", {
                message: "Account unavailable",
              });
            return { data: session };
          },
        },
      },
    },
    emailAndPassword: { enabled: true, disableSignUp: true },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    user: {
      additionalFields: {
        isActive: { type: "boolean", defaultValue: true, input: false },
        isSystem: { type: "boolean", defaultValue: false, input: false },
      },
    },
    advanced: {
      cookiePrefix: "wom-cms",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
    plugins: [
      username({
        maxUsernameLength: 40,
        usernameValidator: (value) => /^[a-z0-9_.-]{3,40}$/.test(value),
      }),
    ],
  });
}

export function getAuth() {
  return (authInstance ??= createAuth());
}

export async function requireCmsSession(headers: Headers, permission?: string) {
  // Luôn đọc phiên và quyền từ DB để việc thu hồi phiên hoặc đổi vai trò có hiệu lực ngay.
  const session = await getAuth().api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  if (!session || session.session.expiresAt <= new Date())
    throw new CmsHttpError(401, "errors.unauthorized");
  const identity = await getCmsIdentity(session.user.id);
  if (permission && !checkPermission(identity.scopes, permission))
    throw new CmsHttpError(403, "errors.forbidden");
  return { ...identity, sessionId: session.session.id };
}
