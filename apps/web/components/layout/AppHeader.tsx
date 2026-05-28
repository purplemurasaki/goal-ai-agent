"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import { Button } from "@/components/ui/button";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function AppHeader() {
  const router = useRouter();

  const onLogout = useCallback(async () => {
    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <header className="border-b border-foreground/10 px-4 py-3 flex items-center justify-between">
      <span className="font-semibold">goal-ai-agent</span>
      <Button type="button" variant="outline" size="sm" onClick={onLogout}>
        ログアウト
      </Button>
    </header>
  );
}
