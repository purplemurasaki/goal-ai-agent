import { ApiError } from "@/lib/api-errors";

export function ErrorBox({
  error,
  fallbackMessage = "エラーが発生しました",
}: {
  error: unknown;
  fallbackMessage?: string;
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : fallbackMessage;

  return (
    <div
      className="rounded-md border border-red-600/20 bg-red-600/5 p-3 text-sm text-red-700"
      role="alert"
    >
      {message}
    </div>
  );
}

