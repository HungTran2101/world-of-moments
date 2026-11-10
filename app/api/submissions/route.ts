import { CLIENT_SUBMISSION_ACTOR } from "@/services/constant";
import { submissionViewer, visibleSubmissionWhere, SUBMISSION_PRIVATE_HEADERS } from "@/lib/submissionModeration";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWeatherAtmosphere } from "@/lib/weather";
import { checkSubmissionProtection } from "@/lib/submissionProtection";
import { submissionClientIp } from "@/lib/submissionIp";
import { SUBMISSION_ERROR_CODES } from "@/services/constant";
import { z } from "zod";
import { visitorId, identityRequired, trustedPublicOrigin, originDenied } from "@/lib/submissionIdentity";
import { constants } from "../constant";
import type { SubmissionBlockSupport } from "@/services/submissions/types";
import type { Prisma } from "@prisma/client";
import { compressedJson } from "@/lib/compressedJson";

const CreateSubmissionSchema = z.object({
  // title: z.string().min(1).max(120),
  description: z.string().min(1).max(constants.MAX_DESCRIPTION_LENGTH),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});
const coordinate = (min: number, max: number) => z.string().trim().min(1).transform(Number).pipe(z.number().min(min).max(max));
const BoundsSchema = z.object({
  west: coordinate(-180, 180),
  south: coordinate(-90, 90),
  east: coordinate(-180, 180),
  north: coordinate(-90, 90)
}).refine(bounds => bounds.south <= bounds.north);

// Chỉ lấy vị trí trong vùng đang xem; nội dung được tải riêng khi mở suy nghĩ.
export async function GET(request: NextRequest) {
  const parsed = BoundsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({
      error: "Valid viewport bounds are required"
    }, {
      status: 400
    });
  }
  const {
    west,
    south,
    east,
    north
  } = parsed.data;
  const longitudeRanges: Prisma.SubmissionWhereInput[] = west > east ? [{
    lng: {
      gte: west
    }
  }, {
    lng: {
      lte: east
    }
  }] : [{
    lng: {
      gte: west,
      lte: east
    }
  }];
  // -180 và +180 là cùng một kinh tuyến, kể cả khi nó nằm đúng trên mép viewport.
  if (west === -180) longitudeRanges.push({
    lng: {
      gte: 180
    }
  });
  if (east === 180) longitudeRanges.push({
    lng: {
      lte: -180
    }
  });
  try {
    const submissions = await prisma.submission.findMany({
      where: {
        lat: {
          gte: south,
          lte: north
        },
        // Khi vùng nhìn cắt kinh tuyến 180°, lấy cả hai dải kinh độ ở hai mép bản đồ.
        AND: [visibleSubmissionWhere(submissionViewer(request)), {
          OR: longitudeRanges
        }]
      },
      select: {
        id: true,
        lat: true,
        lng: true
      }
    });
    return await compressedJson(submissions, request, SUBMISSION_PRIVATE_HEADERS);
  } catch {
    return NextResponse.json({
      error: "Failed to fetch submissions"
    }, {
      status: 500
    });
  }
}

// POST /api/submissions - create a new submission
export async function POST(request: NextRequest) {
  if (!trustedPublicOrigin(request)) return originDenied();
  const ip = submissionClientIp(request.headers, process.env.NODE_ENV === "production");
  if (!ip) return NextResponse.json({
    error: "Submission temporarily unavailable"
  }, {
    status: 503,
    headers: SUBMISSION_PRIVATE_HEADERS
  });
  let author_uuid: string | null;
  try {
    author_uuid = visitorId(request);
    const protection = await checkSubmissionProtection(ip, author_uuid);
    // Chỉ trả mã trình duyệt của chính request bị chặn, không trả cookie hoặc chữ ký.
    const blockSupport = {
      browserId: author_uuid,
      contactMail: process.env.NEXT_PUBLIC_ERROR_REPORT_EMAIL?.trim() || null
    } satisfies SubmissionBlockSupport;
    if (protection.status === "network-banned" || protection.status === "limited") {
      const code = protection.status === "network-banned" ? SUBMISSION_ERROR_CODES.NETWORK_BANNED : "SUBMISSION_RATE_LIMITED";
      return NextResponse.json({
        error: "Too many requests",
        code,
        ...(protection.status === "network-banned" ? blockSupport : {})
      }, {
        status: 429,
        headers: {
          ...SUBMISSION_PRIVATE_HEADERS,
          "Retry-After": String(protection.retryAfter)
        }
      });
    }
    if (protection.status === "browser-blocked") return NextResponse.json({
      error: "This browser is blocked",
      code: SUBMISSION_ERROR_CODES.BROWSER_BLOCKED,
      ...blockSupport
    }, {
      status: 403,
      headers: SUBMISSION_PRIVATE_HEADERS
    });
    if (!author_uuid) return identityRequired();
  } catch {
    return NextResponse.json({
      error: "Submission temporarily unavailable"
    }, {
      status: 503,
      headers: SUBMISSION_PRIVATE_HEADERS
    });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      error: "Invalid JSON body"
    }, {
      status: 400
    });
  }
  const parsed = CreateSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues
    }, {
      status: 422
    });
  }
  const {
    description,
    lat,
    lng
  } = parsed.data;
  const {
    summary,
    code
  } = await fetchWeatherAtmosphere(lat, lng);
  const submission = await prisma.submission.create({
    data: {
      // title,
      description,
      lat,
      lng,
      weather_summary: summary,
      weather_code: code,
      author_uuid,
      updatedBy: CLIENT_SUBMISSION_ACTOR
    }
  });
  return NextResponse.json({
    id: submission.id,
    description: submission.description,
    lat: submission.lat,
    lng: submission.lng,
    weather_summary: submission.weather_summary,
    weather_code: submission.weather_code
  }, {
    status: 201,
    headers: SUBMISSION_PRIVATE_HEADERS
  });
}
