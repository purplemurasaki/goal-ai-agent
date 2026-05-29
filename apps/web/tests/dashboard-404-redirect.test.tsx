import React from "react";
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";

import { server } from "./msw/server";

const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => {
  return {
    useRouter: () => ({
      replace,
      push,
    }),
  };
});

vi.mock("next/link", () => {
  return {
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

vi.mock("@supabase/ssr", () => {
  return {
    createBrowserClient: () => ({
      auth: {
        getSession: async () => ({
          data: { session: { access_token: "test_access_token" } },
        }),
      },
    }),
  };
});

describe("/dashboard 404 redirect", () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    replace.mockClear();
    push.mockClear();
  });
  afterAll(() => server.close());

  it("redirects to /goals/new on NOT_FOUND", async () => {
    server.use(
      http.get("http://localhost:8000/api/v1/goals/current", () => {
        return HttpResponse.json(
          {
            code: "NOT_FOUND",
            message: "目標が見つかりません",
            details: {},
          },
          { status: 404 },
        );
      }),
    );

    const { default: DashboardPage } = await import(
      "@/app/(protected)/dashboard/page"
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/goals/new");
    });
  });
});

