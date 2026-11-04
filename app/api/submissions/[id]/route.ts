import { submissionViewer, visibleSubmissionWhere, SUBMISSION_PRIVATE_HEADERS } from "@/lib/submissionModeration";
import { CLIENT_SUBMISSION_ACTOR } from "@/services/submissions/constants";
import { constants } from "@/app/api/constant";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { compressedJson } from "@/lib/compressedJson";

const UpdateSchema = z.object({
  description: z.string().min(1).max(constants.MAX_DESCRIPTION_LENGTH).optional(),
  author_uuid: z.string().uuid(),
});

// GET /api/submissions/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const submission = await prisma.submission.findFirst({
    where: { id, ...visibleSubmissionWhere(submissionViewer(request)) },
    select: {
      id: true,
      // title: true,
      description: true,
      lat: true,
      lng: true,
      weather_summary: true,
      weather_code: true,
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: SUBMISSION_PRIVATE_HEADERS });
  }

  return compressedJson(submission, request, SUBMISSION_PRIVATE_HEADERS);
}

// PATCH /api/submissions/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
  }

  const { author_uuid, ...updates } = parsed.data;

  const existing = await prisma.submission.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.author_uuid !== author_uuid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.submission.update({
    where: { id },
    data: { ...updates, updatedBy: CLIENT_SUBMISSION_ACTOR },
    select: { id: true, description: true, lat: true, lng: true, weather_summary: true, weather_code: true },
  });

  return NextResponse.json(updated, { headers: SUBMISSION_PRIVATE_HEADERS });
}

// DELETE /api/submissions/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const author_uuid = request.headers.get("x-author-uuid");
  if (!author_uuid) {
    return NextResponse.json({ error: "Missing author identity" }, { status: 400 });
  }

  const existing = await prisma.submission.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.author_uuid !== author_uuid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.submission.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
