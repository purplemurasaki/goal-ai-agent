# goal-ai-agent Web (Next.js)

フロントエンド（Next.js App Router）のローカル開発手順です。

関連: [design/tech-stack.md](../../design/tech-stack.md) §10 / [supabase/README.md](../../supabase/README.md) / [apps/api/README.md](../api/README.md)

---

## 前提

| 項目 | 内容 |
|------|------|
| Docker | Docker Desktop が起動していること |
| Supabase | [supabase/README.md](../../supabase/README.md) に従い DB / Auth を起動 |
| API | Docker またはホストで FastAPI（既定: http://localhost:8000） |
| 環境変数 | `apps/web/.env.local` を用意（下記） |

---

## 環境変数（初回セットアップ）

リポジトリルートで:

```powershell
copy apps\web\.env.example apps\web\.env.local
```

`apps/web/.env.local` に以下を設定します（**コミットしない**）。

| 変数 | 説明 | 例 |
|------|------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | `http://127.0.0.1:54321`（ローカル） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key（`supabase status` で確認） | |
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI のベース URL | `http://localhost:8000` |
| `NEXT_PUBLIC_SITE_URL` | フロントのオリジン（OAuth `redirectTo` 用） | `http://127.0.0.1:3000` |

**重要:** ブラウザから API を呼ぶため、`NEXT_PUBLIC_API_BASE_URL` は **`http://localhost:8000`** のままにしてください（Docker 内のサービス名 `http://api:8000` にはしない）。

**OAuth 用:** 開発中のフロント URL は **`http://127.0.0.1:3000` に統一**してください（`localhost` と混在すると `bad_oauth_state` になります）。`NEXT_PUBLIC_SITE_URL` も同じ値にします。

### Google OAuth（ローカル Supabase CLI）

1. GCP で OAuth クライアントを作成し、リダイレクト URI に `http://127.0.0.1:54321/auth/v1/callback` を登録
2. `supabase/.env.example` を `supabase/.env` にコピーし、Client ID / Secret を設定
3. `supabase stop --no-backup` のあと `supabase start` で Auth 設定を反映

詳細は [supabase/README.md](../../supabase/README.md) の「Google OAuth」を参照。

`config.toml` の `additional_redirect_urls` に `http://localhost:3000/**` が含まれていることも確認してください。

OAuth 完了後は `/auth/callback` でセッション Cookie を発行し、`/dashboard` へリダイレクトします（`signInWithOAuth` の `redirectTo` は `NEXT_PUBLIC_SITE_URL/auth/callback` を使用）。

**アクセス URL:** ログインは `http://127.0.0.1:3000/login` を開いてください（`localhost:3000` は使わない）。

API 側の CORS に `http://localhost:3000` が含まれていることも確認してください（[apps/api/.env.example](../api/.env.example) の `CORS_ORIGINS`）。

---

## Docker で起動

リポジトリルートで実行します。

### フロントのみ（API は別途起動済みであること）

```powershell
docker compose -f docker/compose.yml up web --build
```

### API + フロントを同時起動（推奨）

```powershell
docker compose -f docker/compose.yml up --build
```

バックグラウンドで起動する場合:

```powershell
docker compose -f docker/compose.yml up --build -d
```

停止:

```powershell
docker compose -f docker/compose.yml down
```

`node_modules` ボリュームも削除して再構築する場合:

```powershell
docker compose -f docker/compose.yml down -v
docker compose -f docker/compose.yml up --build
```

---

## アクセス URL

| 用途 | URL |
|------|-----|
| フロント（ログイン） | http://127.0.0.1:3000/login |
| ダッシュボード | http://127.0.0.1:3000/dashboard |
| API OpenAPI | http://localhost:8000/docs |
| API ヘルス | http://localhost:8000/api/v1/health |

---

## ホストで直接起動（Docker を使わない場合）

```powershell
cd apps/web
pnpm install
pnpm dev
```

環境変数は `.env.local` を同様に用意してください。

---

## スクリプト

| コマンド | 説明 |
|----------|------|
| `pnpm dev` | 開発サーバー（ホスト直起動） |
| `pnpm dev:docker` | Docker 用（`0.0.0.0:3000`、Compose から使用） |
| `pnpm dev:docker:webpack` | Docker 用・Turbopack 無効（HMR が直らないとき） |
| `pnpm build` | 本番ビルド |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |
| `pnpm generate:api` | OpenAPI から型生成（API 起動が必要） |

---

## トラブルシュート

| 症状 | 対処 |
|------|------|
| `env file ... .env.local not found` | `apps/web/.env.local` を `.env.example` から作成 |
| 依存関係エラー / モジュールが見つからない | `docker compose down -v` 後に `--build` で再起動 |
| ログインできない | Supabase URL / anon key、Redirect URL を確認 |
| `bad_oauth_state` | **127.0.0.1:3000** で開く。DevTools で `127.0.0.1` / `localhost` の Cookie を削除して再ログイン。`web` コンテナ再起動 |
| `webpack-hmr` WebSocket failed | **開発専用**の HMR 接続エラー。OAuth 遷移直前の一瞬だけなら無害なこともある |
| ログインボタンが無反応 | `docker compose -f docker/compose.yml up web --build -d` で再起動。`WATCHPACK_POLLING` が Compose に入っているか確認 |
| 上記でも直らない | ホストで `cd apps/web && pnpm dev`（Docker なし）。または Compose の command を `pnpm dev:docker:webpack` に変更 |
| API に接続できない | `NEXT_PUBLIC_API_BASE_URL` が `http://localhost:8000` か、API / CORS を確認 |
| ポート競合 | 3000 / 8000 を使用しているプロセスを停止 |

---

## 本番デプロイについて

本番フロントは Cloudflare Pages（OpenNext）想定です。本 Dockerfile は **ローカル開発専用** です。
