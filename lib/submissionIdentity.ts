import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const COOKIE_LIFETIME_SECONDS = 31_536_000;
const MILLISECONDS_PER_SECOND = 1_000;
const MIN_SECRET_LENGTH = 32;
const TOKEN_VERSION = "1";
const TOKEN_PART_COUNT = 4;
const MAX_TOKEN_LENGTH = 256;
export const IDENTITY_REQUIRED_CODE = "SUBMISSION_IDENTITY_REQUIRED";
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie"
};
function secret() {
  const value = process.env.SUBMISSION_CLIENT_COOKIE_SECRET;
  if (!value || value.length < MIN_SECRET_LENGTH) throw new Error("Submission identity secret is unavailable");
  return value;
}

function signature(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function identityCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-wom-visitor" : "wom-visitor";
}

export function verifyIdentityToken(token: string | undefined, now = Date.now()): string | null {
  // Kiểm tra cấu hình trước cả token để lỗi cấu hình không bị hiểu nhầm là khách mới.
  secret();
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== TOKEN_PART_COUNT) return null;
  const [version, id, expiry, supplied] = parts;
  if (version !== TOKEN_VERSION || !z.uuid().safeParse(id).success || !/^\d+$/.test(expiry)) return null;
  const expiresAt = Number(expiry);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(now / MILLISECONDS_PER_SECOND)) return null;
  const expected = Buffer.from(signature(`${version}.${id}.${expiry}`));
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? id : null;
}

export function visitorId(request: NextRequest) {
  return verifyIdentityToken(request.cookies.get(identityCookieName())?.value);
}

export function identityRequired() {
  return NextResponse.json({
    error: "Cookies are required for this action",
    code: IDENTITY_REQUIRED_CODE
  }, {
    status: 401,
    headers: PRIVATE_HEADERS
  });
}

export function trustedPublicOrigin(request: Request) {
  // Đọc cấu hình runtime trên server, tránh Next.js đóng băng URL public từ lúc build.
  const expected = new URL(process.env.SUBMISSION_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
  return request.headers.get("origin") === expected && request.headers.get("sec-fetch-site") !== "cross-site";
}

export function originDenied() {
  return NextResponse.json({
    error: "Forbidden"
  }, {
    status: 403,
    headers: PRIVATE_HEADERS
  });
}

export function initializeVisitor(request: NextRequest) {
  const id = visitorId(request) ?? randomUUID();
  const expiresAt = Math.floor(Date.now() / MILLISECONDS_PER_SECOND) + COOKIE_LIFETIME_SECONDS;
  const payload = `${TOKEN_VERSION}.${id}.${expiresAt}`;
  // Khóa cache tách miền ký, không thể dùng như cookie hoặc ID tác giả để cấp quyền.
  const cacheKey = signature(`cache:${id}`);
  const response = NextResponse.json({
    cacheKey
  }, {
    headers: PRIVATE_HEADERS
  });
  response.cookies.set(identityCookieName(), `${payload}.${signature(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_LIFETIME_SECONDS
  });
  return response;
}
