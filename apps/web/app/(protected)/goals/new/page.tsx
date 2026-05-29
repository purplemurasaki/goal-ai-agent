'use client';

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBrowserClient } from "@supabase/ssr";

import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/api-errors";
import {
  createTempChatMessage,
  throwApiErrorFromResponse,
} from "@/lib/chat-helpers";
import { streamSSE } from "@/lib/sse/stream-sse";

import type {
  ChatMessageResponse,
  GoalCreate,
  GoalResponse,
} from "@/types/api.generated";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBox } from "@/components/ui/error-box";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

const goalSchema = z.object({
  title: z.string().min(1).max(200),
  due_date: z.string().min(1), // HTML date input
  description: z.string().max(2000).optional().or(z.literal("")).nullable(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

export default function GoalsNewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<
    ChatMessageResponse[]
  >([]);
  const [streaming, setStreaming] = useState(false);
  const [chatDraft, setChatDraft] = useState("");

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      due_date: "",
      description: null,
    },
  });

  const goalCreate = useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const body: GoalCreate = {
        title: values.title,
        due_date: values.due_date,
        description: values.description ? values.description : null,
      };
      return apiFetch<GoalResponse>("/api/v1/goals", {
        method: "POST",
        body,
      });
    },
    onSuccess: (data) => {
      setGoal(data);
    },
  });

  const coachingMessagesQuery = useQuery<ChatMessageResponse[], unknown>({
    queryKey: ["goals", goal?.id, "chat", "coaching"],
    queryFn: () => {
      if (!goal) throw new Error("goal is required");
      return apiFetch<ChatMessageResponse[]>(
        `/api/v1/goals/${goal.id}/chat/messages?session_kind=coaching`,
      );
    },
    enabled: !!goal?.id,
    retry: false,
  });

  const messagesView = [
    ...(coachingMessagesQuery.data ?? []),
    ...optimisticMessages,
  ];

  const onSendChat = async () => {
    if (!goal?.id) return;
    if (!chatDraft.trim()) return;
    if (streaming) return;

    const content = chatDraft.trim();
    setChatDraft("");
    setStreaming(true);

    // Disable parallel sends to keep optimistic index stable.
    const assistantIndex = optimisticMessages.length + 1;

    const userMsg = createTempChatMessage({
      goalId: goal.id,
      role: "user",
      content,
      sessionKind: "coaching",
      label: "user",
    });

    const assistantMsg = createTempChatMessage({
      goalId: goal.id,
      role: "assistant",
      content: "",
      sessionKind: "coaching",
      label: "assistant",
    });

    setOptimisticMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        throw new ApiError({
          code: "UNAUTHORIZED",
          message: "譛ｪ隱崎ｨｼ縺ｧ縺・,
          status: 401,
        });
      }

      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const res = await fetch(
        `${API_BASE_URL}/api/v1/goals/${goal.id}/chat/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            session_kind: "coaching",
          }),
        },
      );

      if (!res.ok) {
        await throwApiErrorFromResponse(res);
      }

      for await (const ev of streamSSE(res)) {
        if (ev.event === "token") {
          setOptimisticMessages((prev) =>
            prev.map((m, idx) =>
              idx === assistantIndex
                ? {
                    ...m,
                    content: m.content + ev.data,
                  }
                : m,
            ),
          );
        } else if (ev.event === "done") {
          break;
        }
      }
    } finally {
      setStreaming(false);
      setOptimisticMessages([]);
      queryClient.invalidateQueries({
        queryKey: ["goals", goal.id, "chat", "coaching"],
      });
    }
  };

  const showGoalCreateError =
    goalCreate.error instanceof ApiError ? goalCreate.error : null;

  return (
    <main className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">逶ｮ讓吶ｒ菴懈・</h1>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            繝繝・す繝･繝懊・繝峨∈
          </Button>
        </Link>
      </div>

      {!goal ? (
        <Card>
          <CardHeader>
            <CardTitle>逶ｮ讓吶ヵ繧ｩ繝ｼ繝</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form
              className="flex flex-col gap-3"
              onSubmit={form.handleSubmit((values) => goalCreate.mutate(values))}
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">繧ｿ繧､繝医Ν</label>
                <Input {...form.register("title")} placeholder="萓・ 蜑ｯ讌ｭ縺ｧ譛・0荳・・繧帝＃謌・ />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">譛滄剞</label>
                <Input type="date" {...form.register("due_date")} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">隱ｬ譏趣ｼ井ｻｻ諢擾ｼ・/label>
                <Textarea
                  {...form.register("description")}
                  placeholder="陬懆ｶｳ縺後≠繧後・蜈･蜉帙＠縺ｦ縺上□縺輔＞"
                />
              </div>

              {showGoalCreateError ? <ErrorBox error={showGoalCreateError} /> : null}
              {showGoalCreateError?.code === "GOAL_ALREADY_EXISTS" ? (
                <p className="text-sm">
                  既に目標が登録されています。{" "}
                  <Link href="/dashboard" className="underline">
                    ダッシュボード
                  </Link>
                  から確認してください。
                </p>
              ) : null}


              <Button type="submit" disabled={goalCreate.isPending}>
                {goalCreate.isPending ? "菴懈・荳ｭ..." : "逶ｮ讓吶ｒ菴懈・"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {goal ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>coaching 繝√Ε繝・ヨ</CardTitle>
              <p className="text-sm text-foreground/70 truncate">
                {goal.title}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                router.push(`/goals/${goal.id}/decompose`);
              }}
              disabled={streaming}
            >
              蛻・ｧ｣縺ｸ騾ｲ繧
            </Button>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <div className="rounded-md border border-foreground/10 p-3 h-72 overflow-auto">
              {coachingMessagesQuery.isLoading ? (
                <Spinner label="螻･豁ｴ繧定ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ..." />
              ) : coachingMessagesQuery.error ? (
                <ErrorBox error={coachingMessagesQuery.error} />
              ) : messagesView.length === 0 ? (
                <p className="text-sm text-foreground/70">
                  蜈ｷ菴灘喧縺励◆縺・％縺ｨ繧帝∽ｿ｡縺励※縺上□縺輔＞縲・
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {messagesView.map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.role === "user"
                          ? "flex justify-end"
                          : "flex justify-start"
                      }
                    >
                      <div
                        className={
                          m.role === "user"
                            ? "max-w-[85%] rounded-lg bg-foreground/10 p-2 text-sm"
                            : "max-w-[85%] rounded-lg border border-foreground/10 p-2 text-sm"
                        }
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void onSendChat();
              }}
            >
              <Textarea
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="萓・ 縺ｩ縺・＞縺・｡悟虚縺ｫ關ｽ縺ｨ縺帙・縺・＞・・
                disabled={streaming}
              />
              <Button type="submit" disabled={streaming || !chatDraft.trim()}>
                {streaming ? "騾∽ｿ｡荳ｭ..." : "騾∽ｿ｡"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* goalCreate success => setGoal via onSuccess */}
    </main>
  );
}


