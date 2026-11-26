import "server-only";
import { createHash } from "node:crypto";
import type { ClientAuthIpLimit, Prisma } from "@prisma/client";
import { CLIENT_LIMITS } from "@/app/api/client/constant";
import { prisma } from "@/lib/prisma";
import { ClientHttpError } from "@/lib/clientErrors";
import { submissionClientIp } from "@/lib/submissionIp";

export type AuthAction = "login" | "register";
export interface AuthIpAdmission<TAction extends AuthAction = AuthAction> {
  key: string;
  action: TAction;
}
type AuthIpState = Pick<
  ClientAuthIpLimit,
  "requestsAt" | "createdAccountsAt" | "blockedUntil"
>;

export function clientIp(request: Request) {
  const ip = submissionClientIp(request.headers, process.env.NODE_ENV === "production");
  if (!ip) throw new ClientHttpError(503, "unavailable");
  return ip;
}

async function lockAuthIp(tx: Prisma.TransactionClient, key: string) {
  // Cùng IP/hành động dùng một khóa xuyên tiến trình; không giữ khóa khi gọi dịch vụ ngoài.
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`client-auth:${key}`}, 0))`;
}

async function readAuthIpState(
  tx: Prisma.TransactionClient,
  key: string,
  now: Date,
): Promise<AuthIpState> {
  const row = await tx.clientAuthIpLimit.findUnique({
    where: { key },
    select: { requestsAt: true, createdAccountsAt: true, blockedUntil: true },
  });
  const recent = (dates: Date[] | undefined, windowMs: number) =>
    (dates ?? []).filter((date) => date.getTime() > now.getTime() - windowMs);
  return {
    requestsAt: recent(row?.requestsAt, CLIENT_LIMITS.AUTH_REQUEST_WINDOW_MS),
    createdAccountsAt: recent(row?.createdAccountsAt, CLIENT_LIMITS.REGISTRATION_CREATION_WINDOW_MS),
    blockedUntil: row?.blockedUntil && row.blockedUntil > now ? row.blockedUntil : null,
  };
}

async function persistAuthIpState(
  tx: Prisma.TransactionClient,
  key: string,
  state: AuthIpState,
  now: Date,
) {
  // Giữ hàng đến khi hết hạn cả lịch sử lượt thử, lượt tạo tài khoản và lệnh chặn.
  const expiresAt = new Date(Math.max(
    now.getTime(),
    ...state.requestsAt.map((date) => date.getTime() + CLIENT_LIMITS.AUTH_REQUEST_WINDOW_MS),
    ...state.createdAccountsAt.map((date) => date.getTime() + CLIENT_LIMITS.REGISTRATION_CREATION_WINDOW_MS),
    state.blockedUntil?.getTime() ?? now.getTime(),
  ));
  await tx.clientAuthIpLimit.upsert({
    where: { key },
    create: { key, ...state, expiresAt },
    update: { ...state, expiresAt },
  });
}

export async function admitAuthRequest<TAction extends AuthAction>(
  request: Request,
  action: TAction,
): Promise<AuthIpAdmission<TAction>> {
  const key = `${action}:${createHash("sha256").update(clientIp(request)).digest("hex")}`;
  await checkAuthRequest({ key, action }, false);
  return { key, action };
}

export async function countAuthRequest(admission: AuthIpAdmission) {
  await checkAuthRequest(admission, true);
}

async function checkAuthRequest({ key, action }: AuthIpAdmission, countRequest: boolean) {
  const retryAt = await prisma.$transaction(async (tx) => {
    await lockAuthIp(tx, key);
    const now = new Date();
    const state = await readAuthIpState(tx, key, now);
    if (state.blockedUntil) return state.blockedUntil;
    if (!countRequest) return null;
    const maximum = action === "register"
      ? CLIENT_LIMITS.REGISTER_MAX_REQUESTS_PER_IP
      : CLIENT_LIMITS.LOGIN_MAX_REQUESTS_PER_IP;
    state.requestsAt.push(now);
    state.requestsAt = state.requestsAt.slice(-maximum - 1);
    if (state.requestsAt.length > maximum) {
      state.blockedUntil = new Date(now.getTime() + CLIENT_LIMITS.AUTH_IP_BLOCK_DURATION_MS);
    }
    await persistAuthIpState(tx, key, state, now);
    return state.blockedUntil;
  }, { timeout: CLIENT_LIMITS.AUTH_TRANSACTION_TIMEOUT_MS });
  // Trả lỗi sau commit để lần vượt ngưỡng không làm rollback lệnh chặn.
  if (retryAt) throw new ClientHttpError(429, "authRateLimited", retryAt);
}

function assertCreationAllowance(state: AuthIpState) {
  if (state.blockedUntil) {
    throw new ClientHttpError(429, "authRateLimited", state.blockedUntil);
  }
  if (state.createdAccountsAt.length >= CLIENT_LIMITS.MAX_CREATED_ACCOUNTS_PER_IP) {
    const oldest = Math.min(...state.createdAccountsAt.map((date) => date.getTime()));
    throw new ClientHttpError(429, "authRateLimited", new Date(
      oldest + CLIENT_LIMITS.REGISTRATION_CREATION_WINDOW_MS,
    ));
  }
}

export async function checkRegistrationAllowance(admission: AuthIpAdmission<"register">) {
  await prisma.$transaction(async (tx) => {
    await lockAuthIp(tx, admission.key);
    assertCreationAllowance(await readAuthIpState(tx, admission.key, new Date()));
  }, { timeout: CLIENT_LIMITS.AUTH_TRANSACTION_TIMEOUT_MS });
}

export async function withRegistrationAllowance<T>(
  admission: AuthIpAdmission<"register">,
  create: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await lockAuthIp(tx, admission.key);
    const state = await readAuthIpState(tx, admission.key, new Date());
    assertCreationAllowance(state);
    const user = await create(tx);
    const now = new Date();
    state.createdAccountsAt.push(now);
    state.createdAccountsAt = state.createdAccountsAt.slice(-CLIENT_LIMITS.MAX_CREATED_ACCOUNTS_PER_IP);
    // Ghi tài khoản và lần tạo thành công trong cùng transaction; lỗi sẽ rollback cả hai.
    await persistAuthIpState(tx, admission.key, state, now);
    return user;
  }, { timeout: CLIENT_LIMITS.AUTH_TRANSACTION_TIMEOUT_MS });
}
