# goal-ai-agent

目標の策定・達成状況を管理する AI エージェント Web アプリケーションです。

## 概要

- 目標を要素分解し、実行可能な粒度まで落とし込むことを支援します
- AI による目標設定・要素分解のサポート
- 定期的な振り返りとフィードバックを AI で実施
- Google アカウントによるログイン（Supabase 認証）

詳細は [design/draft.md](design/draft.md) を参照してください。

要件の詳細（MVP）は [design/requirements.md](design/requirements.md) を参照してください。

## 設計ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [design/draft.md](design/draft.md) | ビジョン・技術スタック概要 |
| [design/requirements.md](design/requirements.md) | 要件設計書（MVP） |
| [design/database.md](design/database.md) | DB 設計書（物理スキーマ・RLS） |
| [design/tech-stack.md](design/tech-stack.md) | 技術スタック設計書（アーキテクチャ・API・構成） |
| [design/procedure.md](design/procedure.md) | 開発工程 |
| [supabase/README.md](supabase/README.md) | ローカル DB の起動・確認手順 |
| [apps/api/README.md](apps/api/README.md) | FastAPI バックエンドの起動・テスト |

## バックエンド（ローカル）

1. [supabase/README.md](supabase/README.md) に従い Supabase を起動
2. [apps/api/README.md](apps/api/README.md) の手順で API を起動（既定: http://localhost:8000）

## 開発の進め方

工程一覧と手順は [design/procedure.md](design/procedure.md) に従って進めます。

## 開発ルール（プロジェクト固有）

- 詳細ルール: [`.cursor/rules/project-rules.md`](.cursor/rules/project-rules.md)
- PR/レビューの補助: [`.github/pull_request_template.md`](.github/pull_request_template.md)
- コントリビューション: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## 技術スタック（概要）

| 領域 | 技術 |
|------|------|
| クラウド（FE/CDN） | Cloudflare Pages |
| クラウド（API） | AWS App Runner（MVP 推奨） |
| フロントエンド | Next.js 15（SSR / App Router） |
| バックエンド | FastAPI |
| DB / 認証 | Supabase |
| E2E テスト | Playwright |
| インフラ | Terraform |
| CI/CD | GitHub Actions |
| AI | OpenAI, LangGraph |

スタックの詳細は [design/tech-stack.md](design/tech-stack.md) を参照してください。概要は [design/draft.md](design/draft.md) に記載しています。
