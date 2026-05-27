# 次工程（DDL/DML 実装）チェックリスト

対象工程: `design/procedure.md` の「DDL,DMLを実装」

参照: `design/database.md` / `design/tech-stack.md` / `.cursor/rules/project-rules.md`

---

## 事前準備

- [ ] `develop` から `feature/*` を作成して作業する
- [ ] Supabase の dev プロジェクト情報（URL/anon key/DB接続文字列/JWT secret 等）を取得する（秘密情報はコミットしない）
- [ ] `supabase/migrations/` を作成する（まだ無い場合）

---

## DDL 実装（`design/tech-stack.md` §14 の順序）

### 1) ENUM

- [ ] `goal_status`
- [ ] `goal_item_type`
- [ ] `task_status`
- [ ] `chat_role`
- [ ] `chat_session_kind`

### 2) テーブル

- [ ] `profiles`
- [ ] `goals`（`user_id` UNIQUE、description 長さ CHECK など）
- [ ] `goal_items`（階層/並び順/ステータス）
- [ ] `chat_messages`（`metadata` 含む）
- [ ] `review_sessions`（`feedback_text`、`context_snapshot`）
- [ ] `ai_usage_daily`（日次上限カウント）

### 3) インデックス

- [ ] `design/database.md` の定義に沿って追加する（検索・並び順・外部キー向け）

### 4) 関数・トリガー

- [ ] `auth.users` INSERT 時に `profiles` を作るトリガー（`design/database.md` の方針）
- [ ] `updated_at` 自動更新（採用する場合は全テーブルで統一）

### 5) RLS

- [ ] 全業務テーブルに RLS を有効化
- [ ] ユーザー分離（`user_id`）ポリシーを適用
- [ ] FastAPI が service role を使う場合でも、**アプリ層でも `user_id` フィルタ必須**（二重の安全策）

---

## DML（最小）

- [ ] MVP の動作確認に必要な初期データがあるか検討（原則は不要、必要なら dev 用に限定）

---

## 動作確認（最低限）

- [ ] マイグレーション適用が成功する（ローカル or Supabase dev）
- [ ] 制約が期待通り（例: 1ユーザー1目標 UNIQUE、文字数制限 CHECK）
- [ ] RLS が有効で、他ユーザーのデータが見えない前提を崩していない

