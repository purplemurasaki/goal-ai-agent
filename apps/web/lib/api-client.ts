'use client';

import { createBrowserClient } from "@supabase/ssr";

import { ApiError } from "@/lib/api-errors";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function apiFetch<T>(
  path: string,
  init: Omit<RequestInit, "headers"> & {
    headers?: HeadersInit;
    body?: unknown;
  } = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }

  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.access_token) {
    throw new ApiError({
      code: "UNAUTHORIZED",
      message: "未認証です",
      status: 401,
    });
  }

  const url = `${API_BASE_URL}${path}`;

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body !== undefined && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  let body: BodyInit | undefined;
  if (init.body === undefined) {
    body = undefined;
  } else if (isFormData) {
    body = init.body;
  } else {
    body = JSON.stringify(init.body);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    body,
  });

  if (!res.ok) {
    const json = await res
      .json()
      .catch(() => null) as
      | { code?: string; message?: string; details?: Record<string, unknown> }
      | null;

    throw new ApiError({
      code: json?.code ?? "INTERNAL_ERROR",
      message: json?.message ?? "リクエストに失敗しました",
      status: res.status,
      details: json?.details ?? {},
    });
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

