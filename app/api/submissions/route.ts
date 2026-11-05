import { CLIENT_SUBMISSION_ACTOR } from "@/services/constant";
import { submissionViewer, visibleSubmissionWhere, SUBMISSION_PRIVATE_HEADERS } from "@/lib/submissionModeration";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWeatherAtmosphere } from "@/lib/weather";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";
import { constants } from "../constant";
import type { Prisma } from "@prisma/client";
import { compressedJson } from "@/lib/compressedJson";

const CreateSubmissionSchema = z.object({
  // title: z.string().min(1).max(120),
  description: z.string().min(1).max(constants.MAX_DESCRIPTION_LENGTH),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  author_uuid: z.uuid(),
});

const coordinate = (min: number, max: number) => z.string().trim().min(1)
  .transform(Number).pipe(z.number().min(min).max(max));

const BoundsSchema = z.object({
  west: coordinate(-180, 180),
  south: coordinate(-90, 90),
  east: coordinate(-180, 180),
  north: coordinate(-90, 90),
}).refine((bounds) => bounds.south <= bounds.north);

// Chỉ lấy vị trí trong vùng đang xem; nội dung được tải riêng khi mở suy nghĩ.
export async function GET(request: NextRequest) {
  const parsed = BoundsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid viewport bounds are required" }, { status: 400 });
  }

  const { west, south, east, north } = parsed.data;
  const longitudeRanges: Prisma.SubmissionWhereInput[] = west > east
    ? [{ lng: { gte: west } }, { lng: { lte: east } }]
    : [{ lng: { gte: west, lte: east } }];
  // -180 và +180 là cùng một kinh tuyến, kể cả khi nó nằm đúng trên mép viewport.
  if (west === -180) longitudeRanges.push({ lng: { gte: 180 } });
  if (east === 180) longitudeRanges.push({ lng: { lte: -180 } });

  try {
    const submissions = await prisma.submission.findMany({
      where: {
        lat: { gte: south, lte: north },
        // Khi vùng nhìn cắt kinh tuyến 180°, lấy cả hai dải kinh độ ở hai mép bản đồ.
        AND: [visibleSubmissionWhere(submissionViewer(request)), { OR: longitudeRanges }],
      },
      select: {
        id: true,
        lat: true,
        lng: true,
      },
    });

    return await compressedJson(submissions, request, SUBMISSION_PRIVATE_HEADERS);
  } catch {
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

// POST /api/submissions - create a new submission
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    maxRequests: constants.RATE_LIMIT_MAX_REQUESTS,
    windowMs: constants.RATE_LIMIT_WINDOW_MS,
  });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 422 });
  }

  const { description, lat, lng, author_uuid } = parsed.data;

  const { summary, code } = await fetchWeatherAtmosphere(lat, lng);

  const submission = await prisma.submission.create({
    data: {
      // title,
      description,
      lat,
      lng,
      weather_summary: summary,
      weather_code: code,
      author_uuid,
      updatedBy: CLIENT_SUBMISSION_ACTOR,
    },
  });

  return NextResponse.json({
    id: submission.id, description: submission.description, lat: submission.lat, lng: submission.lng,
    weather_summary: submission.weather_summary, weather_code: submission.weather_code,
  }, { status: 201, headers: SUBMISSION_PRIVATE_HEADERS });
}
