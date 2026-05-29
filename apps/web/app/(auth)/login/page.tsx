"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function oauthErrorMessage(errorCode: string | null, description: string | null) {
  if (!errorCode) return description;

  if (errorCode === "bad_oauth_state") {
    return (
      "ログイン状態の検証に失敗しました。http://127.0.0.1:3000 でアクセスし、" +
      "ブラウザの Cookie（127.0.0.1 / localhost）を削除してから再試行してください。"
    );
  }

  if (description) return description;
  return `ログインに失敗しました（${errorCode}）`;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const urlErrorCode = searchParams.get("error_code");
  const urlErrorDescription = searchParams.get("error_description");
  const urlErrorMessage = oauthErrorMessage(urlErrorCode, urlErrorDescription);

  const configError = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return (
        "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。" +
        "apps/web/.env.local を確認し、web コンテナを再起動してください。"
      );
    }
    return null;
  }, []);

  const [error, setError] = useState<string | null>(null);
  const displayError = configError ?? error ?? urlErrorMessage;

  const onLogin = useCallback(async () => {
    if (configError) return;

    setError(null);

    try {
      const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Prevent localhost/127.0.0.1 origin mismatch causing cookies on the wrong host.
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        return;
      }

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      setError(
        "OAuth URL を取得できませんでした。Supabase の設定と環境変数を確認してください。",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
    }
  }, [configError]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={onLogin} disabled={Boolean(configError)}>
            Googleでログイン
          </Button>
          {displayError ? (
            <p className="text-sm text-red-600" role="alert">
              {displayError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[70vh] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>ログイン</CardTitle>
            </CardHeader>
          </Card>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
