'use client';

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { ErrorBox } from "@/components/ui/error-box";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

import type { ReviewResponse } from "@/types/api.generated";

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const goalId = params.id;

  const queryClient = useQueryClient();

  const reviewsQuery = useQuery<ReviewResponse[], unknown>({
    queryKey: ["goals", goalId, "reviews"],
    queryFn: () =>
      apiFetch<ReviewResponse[]>(`/api/v1/goals/${goalId}/reviews`),
    enabled: !!goalId,
    retry: false,
  });

  const createReview = useMutation({
    mutationFn: () =>
      apiFetch<ReviewResponse>(`/api/v1/goals/${goalId}/reviews`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["goals", goalId, "reviews"],
      });
    },
  });

  const reviews = useMemo(() => {
    return (reviewsQuery.data ?? []).slice().sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reviewsQuery.data]);

  return (
    <main className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">振り返り</h1>
        <Button
          variant="secondary"
          onClick={() => createReview.mutate()}
          disabled={createReview.isPending || !goalId}
        >
          {createReview.isPending ? "生成中..." : "振り返る"}
        </Button>
      </div>

      {reviewsQuery.isLoading ? (
        <Spinner label="履歴を読み込み中..." />
      ) : reviewsQuery.error ? (
        <ErrorBox error={reviewsQuery.error} />
      ) : reviews.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>まだ振り返りはありません</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/70">
              「振り返る」を押すと、直近の進捗に基づいたフィードバックが生成されます。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">
                    生成: {new Date(r.created_at).toLocaleString()}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {r.feedback_text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {createReview.error ? <ErrorBox error={createReview.error} /> : null}
    </main>
  );
}

