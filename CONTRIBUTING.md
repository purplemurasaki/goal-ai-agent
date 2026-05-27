# Contributing（開発ルール）

本リポジトリは `design/procedure.md` の工程順に開発する。

詳細な運用ルールは [`.cursor/rules/project-rules.md`](.cursor/rules/project-rules.md) を参照。

---

## ブランチ運用

- 作業は `develop` から `feature/*` を作成して行う
- 原則として `feature/*` から `develop` へ PR を作成する

---

## PR ルール

- PR はテンプレートに従って記入する（`.github/pull_request_template.md`）
- CI が失敗している場合はマージしない
- DB/認証/秘密情報に関わる変更は影響範囲と確認手順を明記する

---

## コミットメッセージ

プレフィックス（例）:

- `docs:` 設計・文書
- `feat:` 機能追加
- `fix:` バグ修正
- `refactor:` リファクタ
- `test:` テスト
- `chore:` 雑務（依存更新等）

