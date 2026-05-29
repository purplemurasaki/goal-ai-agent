export type SSEMessage = {
  event: string;
  data: string;
};

/**
 * Parses a SSE (text/event-stream) response body into discrete events.
 *
 * FastAPI (sse_starlette) emits:
 * - `event: <name>`
 * - `data: <payload>`
 * - blank line between events
 */
export async function* streamSSE(
  response: Response,
): AsyncGenerator<SSEMessage, void, unknown> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";
  let currentEvent: string | null = null;
  let currentDataLines: string[] = [];

  const flush = () => {
    if (!currentDataLines.length) return null;
    const message: SSEMessage = {
      event: currentEvent ?? "message",
      data: currentDataLines.join("\n"),
    };
    currentEvent = null;
    currentDataLines = [];
    return message;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Normalize to \n for simpler parsing.
    const lines = buffer.replace(/\r\n/g, "\n").split("\n");
    buffer = lines.pop() ?? "";

    for (const rawLine of lines) {
      const line = rawLine;

      // blank line => dispatch event
      if (line.trim() === "") {
        const msg = flush();
        if (msg) yield msg;
        continue;
      }

      if (line.startsWith("event:")) {
        currentEvent = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        currentDataLines.push(line.slice("data:".length).trimStart());
      }
    }
  }

  // flush remaining
  const msg = flush();
  if (msg) yield msg;
}

