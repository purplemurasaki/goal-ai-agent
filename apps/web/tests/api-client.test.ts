import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "./msw/server";

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

describe("apiFetch", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("normalizes FastAPI error shape into ApiError", async () => {
    server.use(
      http.get("http://localhost:8000/api/v1/test", () => {
        return HttpResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: "bad request",
            details: { field: "title" },
          },
          { status: 400 },
        );
      }),
    );

    const { apiFetch } = await import("@/lib/api-client");

    try {
      await apiFetch("/api/v1/test");
      throw new Error("expected error");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toMatchObject({
        code: "VALIDATION_ERROR",
        status: 400,
        message: "bad request",
      });
    }
  });
});

