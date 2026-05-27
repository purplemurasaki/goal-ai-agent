# プロジェクト固有ルール（goal-ai-agent）

本ドキュメントは `goal-ai-agent` の実装工程（DDL/DML、フロント、バックエンド、CI/CD、Terraform）を進めるための運用ルールを定義する。

関連: `design/procedure.md` / `design/tech-stack.md` / `design/database.md` / `design/requirements.md`

---

## Git 運用（必須）

### ブランチ戦略

- 基本: `develop` から `feature/*` を作成して作業する（`design/procedure.md` に準拠）
- `main` はリリース用（CD は `main` マージ後に動く想定）

### PR ルール

- PR は **目的 / 変更点 / テスト手順 / 影響範囲** を必ず書く（テンプレは `.github/pull_request_template.md`）
- マージ条件（最低限）
  - CI がすべて成功している
  - 影響範囲が説明されている（DB/FE/BE/インフラ）
  - 秘密情報（API key 等）をコミットしていない

### コミットメッセージ

既存のスタイルに合わせ、プレフィックスを付ける。

- `docs:` 設計/README 等
- `feat:` 機能追加
- `fix:` バグ修正
- `refactor:` リファクタ
- `test:` テスト追加/修正
- `chore:` 設定・依存更新など

例: `feat: add goal item progress update endpoint`

---

## ディレクトリと責務

`design/tech-stack.md` のモノレポ方針に従う。

- `apps/web/`: Next.js（UI、Supabase Auth、API 呼び出し）
- `apps/api/`: FastAPI（認可、業務 CRUD、AI オーケストレーション）
- `supabase/migrations/`: DDL（`design/database.md` と整合）
- `infra/`: Terraform（後工程）
- `e2e/`: Playwright（後工程）
- `design/`: 設計書

※ 現時点のリポジトリには `apps/` 等の実装ディレクトリは未作成だが、以降工程でこの構成で作成する。

### 置いてはいけないもの

- 秘密情報: `.env` / キー / 接続文字列など（`.env.example` のみコミット可）
- 生成物: ビルド成果物、テストレポート等（`.gitignore` に従う）

---

## コーディング規約（共通）

### 秘密情報とログ

- クライアントに **service role** を露出しない（`design/tech-stack.md` / `design/database.md` の前提）
- ログに PII（email 等）をそのまま出さない（必要ならマスク）

### API エラー形式（BE→FE）

`design/tech-stack.md` §6.3 の形式に統一する。

```json
{
  "code": "SOME_CODE",
  "message": "ユーザー向けメッセージ",
  "details": {}
}
```

---

## フロントエンド（Next.js）運用ルール

- API 呼び出しは FastAPI 経由（Supabase REST で業務データを直接 CRUD しない）
- `NEXT_PUBLIC_*` 以外の秘密はクライアントに載せない
- 状態管理は `design/tech-stack.md` §8.2（React Query、RHF+Zod）を基本とする

---

## バックエンド（FastAPI）運用ルール

- 認可は常に「JWT の `sub` を `current_user_id` として扱い、全クエリをフィルタ」する（`design/tech-stack.md` §5/§6.4）
- `goal_id` を含む操作では `goals.user_id = current_user_id` を必ず検証する（親所有権チェック）
- AI 呼び出しは Moderation → 日次上限チェック → 実行の順（`design/tech-stack.md` §9/§6.5）

---

## DB / マイグレーション運用ルール

### マイグレーション配置

`design/tech-stack.md` §14 の構成に従い、`supabase/migrations/` に分割して置く。

- ENUM → テーブル → インデックス → 関数/トリガー → RLS

### データアクセス

- 業務データは FastAPI のみ経由（設計前提）
- RLS は防御層として維持し、アプリ層でも `user_id` フィルタを必須にする

---

## テスト運用ルール

`design/tech-stack.md` §12 に従う。

- FE: Vitest + RTL + MSW（認証ガード、進捗表示、完了率）
- BE: pytest + httpx（JWT、FR-011、完了率 SQL）
- E2E: Playwright（US-001〜005 の smoke を最初に1本）

