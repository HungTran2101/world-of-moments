import "server-only";

import { NextResponse } from "next/server";
import { ValidationError, type AnyObjectSchema, type InferType } from "yup";
import { Prisma } from "@prisma/client";

export class CmsHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export function cmsJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function assertTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(
    process.env.CMS_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || request.url,
  ).origin;
  if (
    !origin ||
    origin !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new CmsHttpError(403, "errors.forbidden");
  }
}

export async function parseBody<S extends AnyObjectSchema>(
  request: Request,
  schema: S,
): Promise<InferType<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new CmsHttpError(400, "errors.invalidJson");
  }
  return schema.validate(body, { abortEarly: false, stripUnknown: true });
}

export function cmsError(error: unknown) {
  if (error instanceof CmsHttpError)
    return cmsJson(
      {
        error: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
      error.status,
    );
  if (error instanceof ValidationError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.inner.length ? error.inner : [error]) {
      const key = issue.path || "root";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return cmsJson({ error: "errors.validation", fieldErrors }, 422);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002")
      return cmsJson({ error: "errors.duplicate" }, 409);
    if (error.code === "P2003")
      return cmsJson({ error: "errors.roleInUse" }, 409);
    if (error.code === "P2025")
      return cmsJson({ error: "errors.notFound" }, 404);
    if (error.code === "P2034")
      return cmsJson({ error: "errors.conflict" }, 409);
  }
  // Không gửi exception, truy vấn hoặc thông tin xác thực về trình duyệt.
  return cmsJson({ error: "errors.server" }, 500);
}
