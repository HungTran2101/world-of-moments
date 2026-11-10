import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";
import { submissionViewer, SUBMISSION_PRIVATE_HEADERS } from "@/lib/submissionModeration";
import { identityRequired, trustedPublicOrigin, originDenied } from "@/lib/submissionIdentity";

const CreateFutureMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  unlock_condition: z.enum(["after_days:30", "after_days:90", "after_days:365", "random"])
});

// GET /api/future-message — author fetches their own future messages
export async function GET(request: NextRequest) {
  const author_uuid = submissionViewer(request);
  if (!author_uuid) return identityRequired();
  const messages = await prisma.futureMessage.findMany({
    where: {
      author_uuid
    },
    orderBy: {
      created_at: "desc"
    }
  });
  return NextResponse.json(messages.map(message => ({
    id: message.id,
    message: message.message,
    unlock_condition: message.unlock_condition,
    created_at: message.created_at,
    unlocked_at: message.unlocked_at
  })), {
    headers: SUBMISSION_PRIVATE_HEADERS
  });
}

// POST /api/future-message — create a new future message
export async function POST(request: NextRequest) {
  if (!trustedPublicOrigin(request)) return originDenied();
  const author_uuid = submissionViewer(request);
  if (!author_uuid) return identityRequired();
  const limited = rateLimit(request, {
    maxRequests: 2,
    windowMs: 60_000
  });
  if (limited) return limited;
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
  const parsed = CreateFutureMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues
    }, {
      status: 422
    });
  }
  const {
    message,
    unlock_condition
  } = parsed.data;
  const futureMessage = await prisma.futureMessage.create({
    data: {
      author_uuid,
      message,
      unlock_condition
    }
  });
  const result = {
    id: futureMessage.id,
    message: futureMessage.message,
    unlock_condition: futureMessage.unlock_condition,
    created_at: futureMessage.created_at,
    unlocked_at: futureMessage.unlocked_at
  };
  return NextResponse.json(result, {
    status: 201,
    headers: SUBMISSION_PRIVATE_HEADERS
  });
}
