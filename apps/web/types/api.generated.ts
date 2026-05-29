// NOTE: This file is a minimal stub so the frontend can compile before
// OpenAPI-based generation is wired up.

export type UUID = string;

export type GoalStatus = "draft" | "active" | "archived";
export type GoalItemType = "milestone" | "task";
export type TaskStatus = "not_started" | "in_progress" | "completed";
export type ChatRole = "user" | "assistant" | "system";
export type ChatSessionKind = "coaching" | "decompose";

export type JsonRecord = Record<string, unknown>;

export type GoalCreate = {
  title: string;
  due_date: string; // YYYY-MM-DD
  description?: string | null;
};

export type GoalUpdate = {
  title?: string | null;
  due_date?: string | null;
  description?: string | null;
};

export type GoalResponse = {
  id: UUID;
  user_id: UUID;
  title: string;
  due_date: string;
  description: string | null;
  status: GoalStatus;
  decomposition_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskUpdate = {
  status?: TaskStatus | null;
  note?: string | null;
};

export type GoalItemResponse = {
  id: UUID;
  goal_id: UUID;
  parent_id: UUID | null;
  item_type: GoalItemType;
  title: string;
  sort_order: number;
  status: TaskStatus | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskNode = {
  id: UUID;
  title: string;
  sort_order: number;
  status: TaskStatus;
  note: string | null;
};

export type MilestoneNode = {
  id: UUID;
  title: string;
  sort_order: number;
  tasks: TaskNode[];
};

export type GoalItemTreeResponse = {
  milestones: MilestoneNode[];
};

export type NextTask = {
  id: UUID;
  title: string;
};

export type GoalSummaryResponse = {
  completion_rate_pct: number;
  task_total: number;
  task_completed: number;
  task_in_progress: number;
  task_not_started: number;
  next_task: NextTask | null;
};

export type ChatMessageCreate = {
  content: string;
  session_kind: ChatSessionKind;
};

export type ChatMessageResponse = {
  id: UUID;
  goal_id: UUID;
  role: ChatRole;
  content: string;
  session_kind: ChatSessionKind;
  metadata: JsonRecord | null;
  created_at: string;
};

export type ReviewResponse = {
  id: UUID;
  goal_id: UUID;
  feedback_text: string;
  context_snapshot: JsonRecord | null;
  created_at: string;
};

export type ProfileResponse = {
  id: UUID;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

