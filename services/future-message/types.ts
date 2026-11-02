export type UnlockCondition =
  | "after_days:30"
  | "after_days:90"
  | "after_days:365"
  | "random";

export interface FutureMessage {
  id: string;
  author_uuid: string;
  message: string;
  unlock_condition: UnlockCondition;
  created_at: string;
  updated_at: string;
}

export interface CreateFutureMessagePayload {
  author_uuid: string;
  message: string;
  unlock_condition: UnlockCondition;
}
