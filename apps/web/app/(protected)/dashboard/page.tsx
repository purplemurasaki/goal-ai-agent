import { AppHeader } from "@/components/layout/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <>
      <AppHeader />
      <main className="p-4 max-w-2xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>ダッシュボード</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/70">
              ログインに成功しました。目標データの表示は次の PR で API に接続します。
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
