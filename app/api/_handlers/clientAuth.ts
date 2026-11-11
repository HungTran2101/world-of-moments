import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { ClientHttpError } from "@/lib/clientErrors";
import { clientIdentity, getClientRecord } from "@/lib/clientAccounts";
import { CLIENT_LIMITS } from "@/app/api/client/constant";

let instance: ReturnType<typeof createClientAuth> | undefined;
export function clientAuthSecret() {
  const value = process.env.CLIENT_AUTH_SECRET;
  if (
    !value ||
    value.length < CLIENT_LIMITS.MIN_SECRET_LENGTH ||
    value === process.env.BETTER_AUTH_SECRET
  ) {
    throw new Error("CLIENT_AUTH_SECRET must be independent and at least 32 characters");
  }
  return value;
}
function createClientAuth() {
  return betterAuth({
    appName: "World of Moments",
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    basePath: "/api/client/auth",
    secret: clientAuthSecret(),
    database: prismaAdapter(prisma, { provider: "postgresql", transaction: true }),
    emailAndPassword: { enabled: true, disableSignUp: true },
    session: {
      expiresIn: CLIENT_LIMITS.SESSION_LIFETIME_SECONDS,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    advanced: {
      cookiePrefix: "wom-client",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const user = await getClientRecord(session.userId);
            if (!user) throw new APIError("UNAUTHORIZED", { message: "Account unavailable" });
            return { data: session };
          },
        },
      },
    },
  });
}
export const getClientAuth = () => (instance ??= createClientAuth());
export async function getClientSession(headers: Headers) {
  // Khách không có cookie không cần khởi tạo auth, nên duyệt bản đồ không phụ thuộc cấu hình email.
  if (!headers.get("cookie")?.includes("wom-client.session_token=")) return null;
  const session = await getClientAuth().api.getSession({
    headers,
    query: { disableCookieCache: true },
  });
  if (!session || session.session.expiresAt <= new Date()) return null;
  const user = await getClientRecord(session.user.id);
  return user ? clientIdentity(user) : null;
}
export async function requireClientSession(headers: Headers) {
  const user = await getClientSession(headers);
  if (!user) throw new ClientHttpError(401, "unauthorized");
  return user;
}
