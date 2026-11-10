import type { SubmissionStatus } from "@/services/constant";
import type { PaginatedResponse } from "@/services/shared/pagination";

export interface SubmissionPin {
  id: string;
  lat: number;
  lng: number;
}

export interface Submission extends SubmissionPin {
  description: string;
  weather_summary: string | null;
  weather_code?: string | number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSubmissionPayload {
  description: string;
  lat: number;
  lng: number;
}

export interface UpdateSubmissionPayload {
  description?: string;
}

export interface SubmissionHistoryItem extends Submission {
  status: SubmissionStatus;
  created_at: string;
}

export type SubmissionHistoryPage = PaginatedResponse<SubmissionHistoryItem>;

export interface SubmissionBlockSupport {
  browserId: string | null;
  contactMail: string | null;
}
