'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-errors";

import type {
  GoalItemResponse,
  GoalItemTreeResponse,
  TaskNode,
  TaskStatus,
} from "@/types/api.generated";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBox } from "@/components/ui/error-box";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type TaskDraft = {
  status: TaskStatus;
  note: string | null;
};

export default function GoalDetailPage() {
  const params = useParams<{ id: string }>();
  const goalId = params.id;

  const queryClient = useQueryClient();

  const {
    data: items,
    error: itemsError,
    isLoading,
  } = useQuery<GoalItemTreeResponse, unknown>({
    queryKey: ["goals", goalId, "items"],
    queryFn: () =>
      apiFetch<GoalItemTreeResponse>(`/api/v1/goals/${goalId}/items`),
    enabled: !!goalId,
    retry: false,
  });

  const [draftOverrides, setDraftOverrides] = useState<
    Record<string, TaskDraft>
  >({});

  const getTaskDraft = (task: TaskNode): TaskDraft =>
    draftOverrides[task.id] ?? {
      status: task.status,
      note: task.note,
    };

  const updateTask = useMutation({
    mutationFn: async (vars: {
      itemId: string;
      status: TaskStatus;
      note: string | null;
    }) => {
      return apiFetch<GoalItemResponse>(
        `/api/v1/goals/${goalId}/items/${vars.itemId}`,
        {
          method: "PATCH",
          body: {
            status: vars.status,
            note: vars.note,
          },
        },
      );
    },
    onSuccess: (_data, vars) => {
      setDraftOverrides((prev) => {
        const next = { ...prev };
        delete next[vars.itemId];
        return next;
      });
      queryClient.invalidateQueries({
        queryKey: ["goals", goalId, "items"],
      });
      queryClient.invalidateQueries({
        queryKey: ["goals", goalId, "summary"],
      });
    },
  });

  const showItemsError =
    itemsError instanceof ApiError ? itemsError : itemsError;

  const statusOptions: TaskStatus[] = useMemo(
    () => ["not_started", "in_progress", "completed"],
    [],
  );

  if (isLoading) {
    return (
      <main className="p-4">
        <Spinner label="読み込み中..." />
      </main>
    );
  }

  if (itemsError) {
    return (
      <main className="p-4">
        <ErrorBox error={showItemsError} />
      </main>
    );
  }

  if (!items) return null;

  return (
    <main className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">目標の詳細</h1>
        <div className="flex gap-2">
          <Link href={`/goals/${goalId}/decompose`}>
            <Button variant="outline" size="sm">
              分解
            </Button>
          </Link>
          <Link href={`/goals/${goalId}/review`}>
            <Button variant="outline" size="sm">
              振り返り
            </Button>
          </Link>
        </div>
      </div>

      {items.milestones.map((m) => (
        <Card key={m.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">{m.title}</CardTitle>
            <Badge variant="secondary">{m.tasks.length} tasks</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {m.tasks.length === 0 ? (
              <p className="text-sm text-foreground/70">タスクはありません。</p>
            ) : null}

            {m.tasks.map((t) => {
              const draft = getTaskDraft(t);
              const noteValue = draft.note ?? "";

              return (
                <div
                  key={t.id}
                  className="rounded-md border border-foreground/10 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t.title}</div>
                    </div>
                    <Badge>
                      {draft.status === "not_started"
                        ? "未着手"
                        : draft.status === "in_progress"
                          ? "進行中"
                          : "完了"}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-foreground/70">
                      状態
                    </label>
                    <select
                      className="h-9 rounded-md border border-foreground/20 bg-background px-3 text-sm"
                      value={draft.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value as TaskStatus;
                        setDraftOverrides((prev) => ({
                          ...prev,
                          [t.id]: { ...draft, status: nextStatus },
                        }));
                      }}
                      disabled={updateTask.isPending}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s === "not_started"
                            ? "未着手"
                            : s === "in_progress"
                              ? "進行中"
                              : "完了"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-foreground/70">
                      メモ（任意）
                    </label>
                    <Textarea
                      value={noteValue}
                      onChange={(e) => {
                        const nextNote = e.target.value;
                        setDraftOverrides((prev) => ({
                          ...prev,
                          [t.id]: {
                            ...draft,
                            note: nextNote.trim() ? nextNote : null,
                          },
                        }));
                      }}
                      disabled={updateTask.isPending}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateTask.mutate({
                          itemId: t.id,
                          status: draft.status,
                          note: draft.note,
                        })
                      }
                      disabled={updateTask.isPending}
                    >
                      {updateTask.isPending ? "更新中..." : "保存"}
                    </Button>
                  </div>
                </div>
              );
            })}

            {updateTask.error ? <ErrorBox error={updateTask.error} /> : null}
          </CardContent>
        </Card>
      ))}

      <Link href={`/goals/${goalId}/decompose`}>
        <Button variant="secondary">分解を再確認する</Button>
      </Link>
    </main>
  );
}

