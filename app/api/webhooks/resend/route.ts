import { Webhook } from "svix";
import { z } from "zod";
import { recordResendSuppression } from "@/lib/clientEmailSuppression";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response(null, { status: 503 });
  let webhook: Webhook;
  try {
    webhook = new Webhook(secret);
  } catch {
    return new Response(null, { status: 503 });
  }
  let payload: unknown;
  const eventId = request.headers.get("svix-id") || "";
  try {
    // Xác minh chữ ký trên body nguyên bản trước khi đọc dữ liệu; Svix kiểm tra cả hạn timestamp.
    const rawBody = await request.text();
    webhook.verify(rawBody, {
      "svix-id": eventId,
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    });
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 400 });
  }
  try {
    await recordResendSuppression(payload, eventId);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) return new Response(null, { status: 400 });
    // Chỉ xác nhận sau khi ghi DB thành công để Resend có thể thử lại khi hạ tầng gặp sự cố.
    console.error("Resend webhook persistence failed", error instanceof Error ? error.name : "Unknown error");
    return new Response(null, { status: 503 });
  }
}
