import type {
  SubmissionStatus,
  SubmissionValidity,
} from "@/services/submissions/constants";

export interface CmsSubmissionRecord {
  id: string;
  description: string;
  lat: number;
  lng: number;
  authorUuid: string;
  weatherSummary: string | null;
  weatherCode: number | null;
  status: SubmissionStatus;
  validity: SubmissionValidity;
  createdBy: string;
  createdFrom: "cms" | "client";
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}
