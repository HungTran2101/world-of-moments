export type UnlockCondition = "after_days:30" | "after_days:90" | "after_days:365" | "random";

export interface FutureMessage {
  id: string;
  message: string;
  unlock_condition: UnlockCondition;
  created_at: string;
  unlocked_at: string | null;
}

export interface CreateFutureMessagePayload {
  message: string;
  unlock_condition: UnlockCondition;
}
