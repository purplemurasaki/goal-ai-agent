'use client';

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  GoalItemTreeResponse,
} from "@/types/api.generated";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBox } from "@/components/ui/error-box";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type DecomposeProposalTask = {
  title: string;
  sort_order: number;
};

type DecomposeProposalMilestone = {
  title: string;
  sort_order: number;
  tasks: DecomposeProposalTask[];
};

type DecomposeProposal = {
  proposal_version: number;
  milestones: DecomposeProposalMilestone[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDecomposeProposal(metadata: unknown): DecomposeProposal | null {
  if (!isRecord(metadata)) return null;
  if (!Array.isArray(metadata.milestones)) return null;

  const milestones: DecomposeProposalMilestone[] = metadata.milestones
    .map((rawMilestone) => {
      if (!isRecord(rawMilestone)) return null;
      if (!Array.isArray(rawMilestone.tasks)) return null;

      const tasks: DecomposeProposalTask[] = rawMilestone.tasks
        .map((rawTask) => {
          if (!isRecord(rawTask)) return null;
          const title = String(rawTask.title ?? "");
          if (!title) return null;
          return {
            title,
            sort_order: Number(rawTask.sort_order ?? 0),
          };
        })
        .filter((task): task is DecomposeProposalTask => task !== null);

      const title = String(rawMilestone.title ?? "");
      if (!title) return null;

      return {
        title,
        sort_order: Number(rawMilestone.sort_order ?? 0),
        tasks,
      };
    })
    .filter((milestone): milestone is DecomposeProposalMilestone => milestone !== null);

  return {
    proposal_version: Number(metadata.proposal_version ?? 1),
    milestones,
  };
}

export default function DecomposePage() {
  const params = useParams<{ id: string }>();
  const goalId = params.id;

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

  const [optimisticMessages, setOptimisticMessages] = useState<
    ChatMessageResponse[]
  >([]);
  const [streaming, setStreaming] = useState(false);
  const [chatDraft, setChatDraft] = useState("");

  const decomposeMessagesQuery = useQuery<ChatMessageResponse[], unknown>({
    queryKey: ["goals", goalId, "chat", "decompose"],
    queryFn: () => {
      if (!goalId) throw new Error("goalId is required");
      return apiFetch<ChatMessageResponse[]>(
        `/api/v1/goals/${goalId}/chat/messages?session_kind=decompose`,
      );
    },
    enabled: !!goalId,
    retry: false,
  });

  const messagesView = useMemo(
    () => [...(decomposeMessagesQuery.data ?? []), ...optimisticMessages],
    [decomposeMessagesQuery.data, optimisticMessages],
  );

  const latestProposal = useMemo(() => {
    const latestAssistant = [...messagesView]
      .slice()
      .reverse()
      .find((m) => m.role === "assistant");
    if (!latestAssistant) return null;
    return parseDecomposeProposal(latestAssistant.metadata);
  }, [messagesView]);

  const confirmBulk = useMutation({
    mutationFn: async (): Promise<GoalItemTreeResponse> => {
      if (!goalId) throw new Error("goalId is required");
      return apiFetch<GoalItemTreeResponse>(`/api/v1/goals/${goalId}/items/bulk`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      router.push(`/goals/${goalId}`);
    },
  });

  const onSendChat = async () => {
    if (!goalId) return;
    if (!chatDraft.trim()) return;
    if (streaming) return;

    const content = chatDraft.trim();
    setChatDraft("");
    setStreaming(true);

    const assistantIndex = optimisticMessages.length + 1;

    const userMsg = createTempChatMessage({
      goalId,
      role: "user",
      content,
      sessionKind: "decompose",
      label: "user",
    });

    const assistantMsg = createTempChatMessage({
      goalId,
      role: "assistant",
      content: "",
      sessionKind: "decompose",
      label: "assistant",
    });

    setOptimisticMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        throw new ApiError({
          code: "UNAUTHORIZED",
          message: "未認証です",
          status: 401,
        });
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const res = await fetch(
        `${API_BASE_URL}/api/v1/goals/${goalId}/chat/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content,
            session_kind: "decompose",
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
      if (goalId) {
        queryClient.invalidateQueries({
          queryKey: ["goals", goalId, "chat", "decompose"],
        });
      }
    }
  };

  return (
    <main className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">分解 / 確認</h1>
        <div className="flex gap-2">
          <Link href={`/goals/${goalId}`}>
            <Button variant="outline" size="sm">
              詳細へ
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => confirmBulk.mutate()}
            disabled={confirmBulk.isPending || streaming || !latestProposal}
          >
            確定
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>提案ツリー</CardTitle>
            <p className="text-sm text-foreground/70">
              最新の assistant `metadata` を元に表示します。
            </p>
          </div>
          {latestProposal ? (
            <Badge>
              {latestProposal.milestones.reduce(
                (acc, m) => acc + m.tasks.length,
                0,
              )}{" "}
              tasks
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {decomposeMessagesQuery.isLoading ? (
            <Spinner label="提案読み込み中..." />
          ) : decomposeMessagesQuery.error ? (
            <ErrorBox error={decomposeMessagesQuery.error} />
          ) : latestProposal ? (
            <div className="flex flex-col gap-4">
              {latestProposal.milestones.map((m) => (
                <div key={`${m.sort_order}-${m.title}`} className="flex flex-col gap-2">
                  <div className="font-medium">{m.title}</div>
                  {m.tasks.length === 0 ? (
                    <p className="text-sm text-foreground/70">タスクなし</p>
                  ) : (
                    <ul className="list-disc pl-5 text-sm text-foreground/90">
                      {m.tasks.map((t, idx) => (
                        <li key={`${idx}-${t.sort_order}-${t.title}`}>{t.title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/70">
              まずチャットに分解の指示（例: 「この目標を中項目・タスクに分解して」）を送ってください。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>decompose チャット</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-md border border-foreground/10 p-3 h-72 overflow-auto">
            {decomposeMessagesQuery.isLoading ? (
              <Spinner label="読み込み中..." />
            ) : messagesView.length === 0 ? (
              <p className="text-sm text-foreground/70">
                分解指示を送って提案を生成してください。
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {messagesView.map((m) => (
                  <div
                    key={m.id}
                    className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
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

          {confirmBulk.error ? <ErrorBox error={confirmBulk.error} /> : null}

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
              placeholder="例: 中項目とタスクに分解して。提案を少し厳しめにして。"
              disabled={streaming}
            />
            <Button
              type="submit"
              disabled={streaming || !chatDraft.trim()}
            >
              {streaming ? "送信中..." : "送信"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

