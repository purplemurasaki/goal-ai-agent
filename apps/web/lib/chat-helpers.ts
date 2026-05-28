import type {
  ChatMessageResponse,
  ChatRole,
  ChatSessionKind,
} from "@/types/api.generated";

import type { FastApiErrorShape } from "@/lib/api-errors";
import { ApiError } from "@/lib/api-errors";

export function createTempChatMessage(params: {
  goalId: string;
  role: ChatRole;
  content: string;
  sessionKind: ChatSessionKind;
  label: string;
}): ChatMessageResponse {
  return {
    id: `temp-${params.label}-${crypto.randomUUID()}`,
    goal_id: params.goalId,
    role: params.role,
    content: params.content,
    session_kind: params.sessionKind,
    metadata: null,
    created_at: new Date().toISOString(),
  };
}

export function parseFastApiErrorFromJson(json: unknown): FastApiErrorShape | null {
  if (!json || typeof json !== "object") return null;
  const record = json as Record<string, unknown>;
  if (typeof record.code !== "string" || typeof record.message !== "string") {
    return null;
  }
  const details =
    record.details && typeof record.details === "object"
      ? (record.details as Record<string, unknown>)
      : {};
  return { code: record.code, message: record.message, details };
}

export async function throwApiErrorFromResponse(res: Response): Promise<never> {
  const json = await res.json().catch(() => null);
  const parsed = parseFastApiErrorFromJson(json);
  throw new ApiError({
    code: parsed?.code ?? "INTERNAL_ERROR",
    message: parsed?.message ?? "リクエストに失敗しました",
    status: res.status,
    details: parsed?.details ?? {},
  });
}
