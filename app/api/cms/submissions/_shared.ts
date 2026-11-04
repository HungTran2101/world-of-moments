import "server-only";

import type { Prisma, Submission } from "@prisma/client";
import { CmsHttpError } from "@/handlers/http";
import { checkPermission, permissions } from "@/services/permission";
import type { CmsUser } from "@/services/shared/types";
import type { SubmissionUpdateValues } from "@/services/schemas";
import type { CmsSubmissionRecord } from "@/services/cms/submissions/types";
import {
  serializeValidity,
  toDatabaseValidity,
} from "@/lib/submissionModeration";

export function serializeSubmission(row: Submission): CmsSubmissionRecord {
  return {
    id: row.id,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    authorUuid: row.author_uuid,
    weatherSummary: row.weather_summary,
    weatherCode: row.weather_code,
    status: row.status,
    validity: serializeValidity(row.validity),
    createdBy: row.createdBy,
    createdFrom: row.createdFrom,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    updatedBy: row.updatedBy,
  };
}

export function assertModerationPermission(
  actor: CmsUser,
  data: SubmissionUpdateValues,
) {
  if (
    (data.status !== undefined &&
      !checkPermission(actor.scopes, permissions.SUBMISSION_UPDATE_STATUS)) ||
    (data.validity !== undefined &&
      !checkPermission(actor.scopes, permissions.SUBMISSION_UPDATE_VALIDITY))
  ) {
    throw new CmsHttpError(403, "errors.forbidden");
  }
}

export function assertPublicationConfirmed(
  nonValidCount: number,
  confirmed?: boolean,
) {
  if (nonValidCount && !confirmed) {
    throw new CmsHttpError(409, "errors.confirmPublish", undefined, {
      nonValidCount,
    });
  }
}

export function countNonValidPublications(
  rows: Pick<Submission, "status" | "validity">[],
  data: SubmissionUpdateValues,
) {
  return rows.filter(
    (row) =>
      (data.status ?? row.status) === "published" &&
      (data.validity ?? serializeValidity(row.validity)) !== "valid",
  ).length;
}

export function submissionModerationData(
  data: SubmissionUpdateValues,
  actorName: string,
): Prisma.SubmissionUpdateManyMutationInput {
  return {
    updatedBy: actorName,
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.validity !== undefined
      ? { validity: toDatabaseValidity(data.validity) }
      : {}),
  };
}
