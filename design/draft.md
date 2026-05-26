# アプリケーション概要

---

- 本アプリケーションは目標策定、達成状況を管理するAIエージェントアプリケーションである
- 目標を達成するために、その目標を要素分解し、実行可能な粒度まで落としこめるようにしたい
- 目標を一人で建てるのは難しいので、それをAIでサポートし、目標とその要素分解までを実施していきたい
- 定期的な振り返り、FBがAIを使ってできるようにしたい
- ユーザはログインして、アプリにアクセスする。ログインはGoogleアカウントを使用したい

# MVP と将来拡張

---

## MVP（初回リリース）

- **利用者:** 個人利用のみ（1ユーザーが自分の目標を管理）
- **目標:** 同時に1件のみ
- **機能:** Googleログイン、目標1件の作成・AI分解・進捗記録・手動トリガーの簡易振り返り

詳細な要件は [requirements.md](requirements.md) を参照。

## 将来拡張（MVP対象外）

- 複数目標の同時管理
- チーム・共有目標
- 定期通知・スケジュール振り返り
- 広告表示・収益化

# 技術スタック

---

|                      | ライブラリ                    | 備考                                                                 |
| -------------------- | ----------------------------- | -------------------------------------------------------------------- |
| クラウド（FE/CDN）   | Cloudflare                    | Pages（Next.js SSR）、DNS、WAF。詳細は [tech-stack.md](tech-stack.md) |
| クラウド（API）      | AWS App Runner                | MVP 推奨。代替: ECS Fargate。FastAPI コンテナ                          |
| フロントエンド       | Next.js 15（App Router）      | OpenNext + Cloudflare Pages。構成は [tech-stack.md](tech-stack.md)   |
| バックエンド         | FastAPI                       | AWS 上でホスト。構成は [tech-stack.md](tech-stack.md)                |
| DB                   | Supabase                      | PostgreSQL + Auth                                                    |
| DBマイグレーション   | Supabase CLI                  | `supabase/migrations/`                                               |
| 認証                 | Supabase Auth（Google OAuth） | JWT を FastAPI に Bearer 送信                                        |
| フロントエンドテスト | Vitest + RTL + MSW            | 方針は [tech-stack.md](tech-stack.md) §12                            |
| バックエンドテスト   | pytest + httpx                | 方針は [tech-stack.md](tech-stack.md) §12                            |
| E2Eテスト            | Playwright                    | 方針は [tech-stack.md](tech-stack.md) §12                            |
| インフラ構築         | Terraform           |                                                     |
| 構成管理             | GitHub              | gitflowをベースに適用                               |
| CICD                 | GitHubActions       |                                                     |
| AI                   | OpenAI              |                                                     |
| AI構築               | LangChain,LangGraph |                                                     |

- 環境はDockerで構築する。
- PR作成時にCIでテストとビルド
- mainブランチにプッシュのタイミングでCIでテストとビルド、CDでデプロイ

# その他

---

- 可能な限りコストは押さえたい
- UI/UXを重視し、ユーザの使い勝手がよいIFとすること
- 最終的には広告収入が得られることを目指したい
