import type { SubmissionPin } from "@/services/submissions/types";

const MAX_LATITUDE_DEGREES = 90;
const MAX_LONGITUDE_DEGREES = 180;

export function getThoughtMapHref(submission: SubmissionPin): string {
  const query = new URLSearchParams({
    thought: submission.id,
    lat: String(submission.lat),
    lng: String(submission.lng),
  });
  return `/?${query}`;
}

export function readThoughtMapTarget(search: string): SubmissionPin | null {
  const query = new URLSearchParams(search);
  const id = query.get("thought")?.trim();
  const rawLat = query.get("lat")?.trim();
  const rawLng = query.get("lng")?.trim();
  if (!id || !rawLat || !rawLng) return null;

  const lat = Number(rawLat);
  const lng = Number(rawLng);
  // Bỏ qua liên kết thiếu hoặc sai tọa độ để không đưa camera ra ngoài bản đồ.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)
    || Math.abs(lat) > MAX_LATITUDE_DEGREES
    || Math.abs(lng) > MAX_LONGITUDE_DEGREES) return null;

  return { id, lat, lng };
}
