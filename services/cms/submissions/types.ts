import type { SubmissionStatus, SubmissionValidity } from "@/services/constant";

export interface CmsSubmissionRecord {
  id: string;
  description: string;
  lat: number;
  lng: number;
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
