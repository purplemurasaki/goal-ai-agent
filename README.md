# goal-ai-agent

目標の策定・達成状況を管理する AI エージェント Web アプリケーションです。

## 概要

- 目標を要素分解し、実行可能な粒度まで落とし込むことを支援します
- AI による目標設定・要素分解のサポート
- 定期的な振り返りとフィードバックを AI で実施
- Google アカウントによるログイン（Supabase 認証）

詳細は [design/draft.md](design/draft.md) を参照してください。

## 開発の進め方

工程一覧と手順は [design/procedure.md](design/procedure.md) に従って進めます。

## 技術スタック（概要）

| 領域 | 技術 |
|------|------|
| クラウド | Cloudflare |
| フロントエンド | Next.js（SSR） |
| バックエンド | FastAPI |
| DB / 認証 | Supabase |
| E2E テスト | Playwright |
| インフラ | Terraform |
| CI/CD | GitHub Actions |
| AI | OpenAI, LangChain, LangGraph |

スタックの詳細・具体化は今後の設計書で定義します。一覧は [design/draft.md](design/draft.md) を参照してください。
