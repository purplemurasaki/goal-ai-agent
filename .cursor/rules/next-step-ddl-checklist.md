# 次工程（DDL/DML 実装）チェックリスト

対象工程: `design/procedure.md` の「DDL,DMLを実装」

参照: `design/database.md` / `design/tech-stack.md` / `.cursor/rules/project-rules.md`

---

## 事前準備

- [x] `develop` から `feature/*` を作成して作業する
- [ ] Supabase の dev プロジェクト情報（URL/anon key/DB接続文字列/JWT secret 等）を取得する（秘密情報はコミットしない）
- [x] `supabase/migrations/` を作成する（まだ無い場合）

---

## DDL 実装（`design/tech-stack.md` §14 の順序）

### 1) ENUM

- [x] `goal_status`
- [x] `goal_item_type`
- [x] `task_status`
- [x] `chat_role`
- [x] `chat_session_kind`

### 2) テーブル

- [x] `profiles`
- [x] `goals`（`user_id` UNIQUE、description 長さ CHECK など）
- [x] `goal_items`（階層/並び順/ステータス）
- [x] `chat_messages`（`metadata` 含む）
- [x] `review_sessions`（`feedback_text`、`context_snapshot`）
- [x] `ai_usage_daily`（日次上限カウント）

### 3) インデックス

- [x] `design/database.md` の定義に沿って追加する（検索・並び順・外部キー向け）

### 4) 関数・トリガー

- [x] `auth.users` INSERT 時に `profiles` を作るトリガー（`design/database.md` の方針）
- [ ] `updated_at` 自動更新（採用する場合は全テーブルで統一）※MVPでは未採用

### 5) RLS

- [x] 全業務テーブルに RLS を有効化
- [x] ユーザー分離（`user_id`）ポリシーを適用
- [x] FastAPI が service role を使う場合でも、**アプリ層でも `user_id` フィルタ必須**（二重の安全策）

---

## DML（最小）

- [x] MVP の動作確認に必要な初期データがあるか検討（原則は不要、必要なら dev 用に限定）

---

## 動作確認（最低限）

- [x] マイグレーション適用が成功する（ローカル or Supabase dev）
- [x] 制約が期待通り（例: 1ユーザー1目標 UNIQUE、文字数制限 CHECK）
- [x] RLS が有効で、他ユーザーのデータが見えない前提を崩していない

ローカル検証スクリプト: `supabase/scripts/validate_constraints.sql`, `supabase/scripts/validate_rls.sql`  
手順書: [supabase/README.md](../../supabase/README.md)
