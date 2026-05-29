import { describe, it, expect } from "vitest";

import { streamSSE } from "@/lib/sse/stream-sse";

describe("streamSSE", () => {
  it("parses event/data and dispatches token/done", async () => {
    const payload =
      "event: token\n" +
      "data: hello\n\n" +
      "event: token\n" +
      "data: world\n\n" +
      "event: done\n" +
      "data: \n\n";

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });

    const res = new Response(stream, {
      headers: { "Content-Type": "text/event-stream" },
    });

    const events: { event: string; data: string }[] = [];
    for await (const ev of streamSSE(res)) {
      events.push(ev);
    }

    expect(events).toEqual([
      { event: "token", data: "hello" },
      { event: "token", data: "world" },
      { event: "done", data: "" },
    ]);
  });
});

