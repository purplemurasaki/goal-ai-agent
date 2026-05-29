"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { AppHeader } from "@/components/layout/AppHeader";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-errors";
import type { GoalResponse, GoalSummaryResponse } from "@/types/api.generated";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBox } from "@/components/ui/error-box";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const router = useRouter();

  const {
    data: goal,
    error: goalError,
    isLoading: goalLoading,
  } = useQuery<GoalResponse, unknown>({
    queryKey: ["goals", "current"],
    queryFn: () => apiFetch<GoalResponse>("/api/v1/goals/current"),
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 404) return false;
      return count < 1;
    },
  });

  useEffect(() => {
    if (goalError instanceof ApiError && goalError.status === 404) {
      router.replace("/goals/new");
    }
  }, [goalError, router]);

  const goalId = goal?.id;

  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
  } = useQuery<GoalSummaryResponse, unknown>({
    queryKey: ["goals", goalId, "summary"],
    queryFn: () => apiFetch<GoalSummaryResponse>(`/api/v1/goals/${goalId}/summary`),
    enabled: Boolean(goalId),
  });

  if (goalLoading) {
    return (
      <>
        <AppHeader />
        <main className="p-4">
          <Spinner label="読み込み中..." />
        </main>
      </>
    );
  }

  if (goalError instanceof ApiError && goalError.status === 404) {
    return (
      <>
        <AppHeader />
        <main className="p-4">
          <Spinner label="目標作成へ移動中..." />
        </main>
      </>
    );
  }

  if (goalError || !goal) {
    return (
      <>
        <AppHeader />
        <main className="p-4 max-w-2xl mx-auto">
          <ErrorBox error={goalError} />
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="p-4 max-w-2xl mx-auto w-full flex flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>{goal.title}</CardTitle>
              <p className="text-sm text-foreground/60 mt-1">期限: {goal.due_date}</p>
            </div>
            <Badge variant="secondary">{goal.status}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {summaryLoading ? (
              <Spinner label="サマリー取得中..." />
            ) : summaryError ? (
              <ErrorBox error={summaryError} />
            ) : summary ? (
              <>
                <p className="text-2xl font-semibold">
                  完了率 {summary.completion_rate_pct.toFixed(0)}%
                </p>
                <p className="text-sm text-foreground/70">
                  タスク {summary.task_completed}/{summary.task_total} 完了
                </p>
                {summary.next_task ? (
                  <p className="text-sm">
                    次のタスク: <span className="font-medium">{summary.next_task.title}</span>
                  </p>
                ) : (
                  <p className="text-sm text-foreground/60">次のタスクはありません</p>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>

        <nav className="flex flex-wrap gap-2">
          <Link className="inline-flex h-9 items-center justify-center rounded-md border border-foreground/20 px-4 text-sm hover:bg-foreground/5" href={`/goals/${goal.id}`}>目標詳細</Link>
          <Link className="inline-flex h-9 items-center justify-center rounded-md border border-foreground/20 px-4 text-sm hover:bg-foreground/5" href={`/goals/${goal.id}/decompose`}>要素分解</Link>
          <Link className="inline-flex h-9 items-center justify-center rounded-md border border-foreground/20 px-4 text-sm hover:bg-foreground/5" href={`/goals/${goal.id}/review`}>振り返り</Link>
        </nav>
      </main>
    </>
  );
}

