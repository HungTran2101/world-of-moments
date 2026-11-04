import { randomUUID } from "node:crypto";
import type { PaginatedResponse } from "@/services/shared/pagination";
import type { CmsSubmissionRecord } from "@/services/cms/submissions/types";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchWeatherAtmosphere } from "@/lib/weather";
import { toDatabaseValidity } from "@/lib/submissionModeration";
import { requireCmsSession } from "@/handlers/auth";
import { cmsJson, parseBody, withCmsRequest } from "@/handlers/http";
import { permissions } from "@/services/permission";
import {
  submissionCreateSchema,
  submissionListSchema,
} from "@/services/schemas";
import {
  DEFAULT_SUBMISSION_STATUS,
  DEFAULT_SUBMISSION_VALIDITY,
} from "@/services/submissions/constants";
import {
  assertModerationPermission,
  assertPublicationConfirmed,
  serializeSubmission,
} from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login required - Permission: submission.show
export async function GET(request: Request) {
  return withCmsRequest(request, async () => {
    await requireCmsSession(request.headers, permissions.SUBMISSION_SHOW);
    const params = await submissionListSchema.validate(
      Object.fromEntries(new URL(request.url).searchParams),
      { abortEarly: false, stripUnknown: true },
    );
    const where: Prisma.SubmissionWhereInput = {
      ...(params.search
        ? { description: { contains: params.search, mode: "insensitive" } }
        : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.validity
        ? { validity: toDatabaseValidity(params.validity) }
        : {}),
    };
    const result = await prisma.$transaction(
      async (tx) => {
        const total = await tx.submission.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
        const page = Math.min(params.page, totalPages);
        const rows = await tx.submission.findMany({
          where,
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
          skip: (page - 1) * params.pageSize,
          take: params.pageSize,
        });
        return {
          items: rows.map(serializeSubmission),
          metadata: { page, pageSize: params.pageSize, total, totalPages },
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
    return cmsJson(result satisfies PaginatedResponse<CmsSubmissionRecord>);
  });
}

// Login required - Permission: submission.create; non-default state also requires submission.updateSubmissionStatus / submission.updateSubmissionValidity
export async function POST(request: Request) {
  return withCmsRequest(request, async () => {
    const actor = await requireCmsSession(
      request.headers,
      permissions.SUBMISSION_CREATE,
    );
    const data = await parseBody(request, submissionCreateSchema);
    assertModerationPermission(actor, {
      ...(data.status !== DEFAULT_SUBMISSION_STATUS
        ? { status: data.status }
        : {}),
      ...(data.validity !== DEFAULT_SUBMISSION_VALIDITY
        ? { validity: data.validity }
        : {}),
    });
    assertPublicationConfirmed(
      Number(data.status === "published" && data.validity !== "valid"),
      data.confirmPublish,
    );
    const weather = await fetchWeatherAtmosphere(data.lat, data.lng);
    const row = await prisma.submission.create({
      data: {
        description: data.description,
        lat: data.lat,
        lng: data.lng,
        author_uuid: randomUUID(),
        status: data.status,
        validity: toDatabaseValidity(data.validity),
        createdBy: actor.name,
        createdFrom: "cms",
        updatedBy: actor.name,
        weather_summary: weather.summary,
        weather_code: weather.code,
      },
    });
    return cmsJson(serializeSubmission(row), 201);
  });
}
