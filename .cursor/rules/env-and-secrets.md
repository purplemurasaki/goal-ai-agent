# 環境変数・秘密情報ルール

## 基本

- 秘密情報（APIキー、JWT secret、DB接続文字列、service role key）は **コミットしない**
- コミットしてよいのは `*.example` のみ
- クライアントに渡してよいのは `NEXT_PUBLIC_*` のみ

## `.env` の置き方（方針）

後工程で以下を配置する。

- ルート: `.env.example`
- `apps/web`: `.env.example`
- `apps/api`: `.env.example`

※ `.gitignore` で `.env` / `.env.*` は無視されるが、例外として `.env.example` はコミット可能。

## Supabase / OpenAI

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` は公開されうる前提（Supabase の設計上）だが、**業務データを直接 CRUD しない** 方針のため、権限設計（RLS）を必須とする
- OpenAI の `OPENAI_API_KEY` はサーバー（FastAPI）側のみ

