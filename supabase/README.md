# ローカル DB（Supabase）の起動と確認手順

本プロジェクトの DB スキーマは `supabase/migrations/` で管理しています。  
ローカルでは Supabase CLI + Docker で PostgreSQL を起動し、マイグレーション適用と内容確認を行います。

関連: [design/database.md](../design/database.md) / [design/tech-stack.md](../design/tech-stack.md) §14

---

## 前提

| 項目 | 内容 |
|------|------|
| Docker | Docker Desktop が起動していること |
| Supabase CLI | 例: `npm install -g supabase`（`supabase --version` で確認） |
| 作業ディレクトリ | リポジトリルート（`supabase/config.toml` がある場所） |

---

## 1. ローカル Supabase を起動する

リポジトリルートで実行します。

```powershell
supabase start
```

初回は Docker イメージの取得に **10〜20 分以上** かかることがあります。

### Windows で `supabase start` が exit 1 になる場合

`storage` や `analytics` のヘルスチェックで失敗することがあります。  
**DB マイグレーション自体は適用済み** のことが多いので、次を試してください。

```powershell
supabase start --ignore-health-check
```

停止・再起動:

```powershell
supabase stop --no-backup
supabase start --ignore-health-check
```

起動状態の確認:

```powershell
supabase status
```

---

## 2. マイグレーションを適用し直す（DB リセット）

スキーマを最初から作り直すとき:

```powershell
supabase db reset
```

`supabase/migrations/` 内の SQL が **タイムスタンプ順** に適用されます。

※ `db reset` 後も storage のヘルスチェックで CLI が exit 1 になる場合があります。  
その場合は DB コンテナが起動していれば、以降の確認手順は実行できます。

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "supabase_db"
```

`healthy` なら DB は利用可能です。

---

## 3. 接続情報（ローカル）

`supabase status` の出力、または既定値:

| 項目 | 値 |
|------|-----|
| DB URL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| API URL | `http://127.0.0.1:54321` |
| Studio | `http://127.0.0.1:54323`（ブラウザでテーブル閲覧） |

---

## 4. 自動検証スクリプト（制約・RLS）

リポジトリに用意した SQL を、DB コンテナへ流し込みます。

### 制約（UNIQUE / CHECK）

```powershell
Get-Content -Raw "supabase\scripts\validate_constraints.sql" |
  docker exec -i supabase_db_01_ai_agent_app psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

成功時の例: `NOTICE: OK: goals.user_id UNIQUE works` などが表示され、最後に `ROLLBACK` されます（テストデータは残しません）。

### RLS（ユーザー分離）

```powershell
Get-Content -Raw "supabase\scripts\validate_rls.sql" |
  docker exec -i supabase_db_01_ai_agent_app psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

成功時の例: `OK: user A RLS` / `OK: user B RLS` が表示されます。

---

## 5. 手動で中身を確認する（psql）

### 対話的に接続

```powershell
docker exec -it supabase_db_01_ai_agent_app psql -U postgres -d postgres
```

### よく使う確認コマンド（psql 内）

```sql
-- テーブル一覧
\dt public.*

-- RLS が有効か
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'profiles','goals','goal_items','chat_messages','review_sessions','ai_usage_daily'
  )
ORDER BY 1;

-- RLS ポリシー一覧
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- goals の制約一覧
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.goals'::regclass;

-- 終了
\q
```

### 1 行だけ実行する例

```powershell
docker exec supabase_db_01_ai_agent_app psql -U postgres -d postgres -c "\dt public.*"
```

---

## 6. Studio（GUI）で見る

ブラウザで Supabase Studio を開き、テーブル・データを確認します。

```
http://127.0.0.1:54323
```

`Table Editor` から `goals` / `goal_items` などを参照できます。

---

## 7. マイグレーションを追加するとき

新しい SQL ファイルを作成:

```powershell
supabase migration new <説明的な名前>
```

`supabase/migrations/` にファイルができたら SQL を記述し、`supabase db reset` でローカルに適用してから PR に含めます。

実装順序の目安: **ENUM → テーブル → インデックス → 関数/トリガー → RLS**  
（詳細は [`.cursor/rules/next-step-ddl-checklist.md`](../.cursor/rules/next-step-ddl-checklist.md)）

---

## トラブルシュート（簡易）

| 症状 | 対処 |
|------|------|
| `supabase` コマンドがない | `npm install -g supabase` |
| `No such container: supabase_db_...` | `supabase start` を完了まで待つ / `docker ps` で DB コンテナ確認 |
| イメージ取得が遅い | 初回のみ。2 回目以降は短縮される |
| `db reset` が exit 1 | storage ヘルスチェック失敗の可能性。DB が healthy なら検証スクリプトは実行可 |
| ポート競合 | `supabase stop --no-backup` 後に再起動 |

---

## 秘密情報について

ローカル Supabase の JWT / API キーは **開発専用の既定値** です。本番や公開リポジトリには載せないでください。  
アプリ用の環境変数テンプレはルートの [`.env.example`](../.env.example) を参照（値は空のままコミット）。
