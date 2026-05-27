# goal-ai-agent API (FastAPI)

## 前提

- Python 3.12+
- ローカル Supabase（[supabase/README.md](../../supabase/README.md)）

```powershell
supabase start --ignore-health-check
```

## セットアップ

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env.local
```

`.env.local` に `supabase status` の値を設定:

| 変数 | 取得元 |
|------|--------|
| `DATABASE_URL` | DB URL を `postgresql+asyncpg://...` 形式に変更 |
| `SUPABASE_JWT_SECRET` | JWT secret |

## 起動

```powershell
uvicorn app.main:app --reload --port 8000
```

- OpenAPI: http://localhost:8000/openapi.json
- ヘルス: http://localhost:8000/api/v1/health

## 手動テスト用 JWT

pytest と同様にローカル JWT secret で署名した Bearer トークンを使えます。  
本番相当の検証では Supabase Auth でログインし、`access_token` を `Authorization: Bearer` に付与してください。

## テスト

```powershell
pytest
```

DB が起動していない場合、統合テストはスキップされます。`test_security.py` の単体テストは DB 不要です。

## Docker Compose

リポジトリルートから:

```powershell
docker compose -f docker/compose.yml up api
```
