---
name: env-and-secrets-guard
description: Prevents committing secrets and clarifies env var exposure rules for this project. Use when creating `.env.example`, discussing Supabase/OpenAI keys, JWT secrets, or when adding CI/CD or deployment configuration.
disable-model-invocation: true
---

# Env and secrets guard

## Source of truth to read
- `.cursor/rules/env-and-secrets.md`
- `.cursor/rules/project-rules.md`
- `design/tech-stack.md` (auth + deployment assumptions)

## Non-negotiables
- **Never commit secrets** (API keys, JWT secret, DB connection strings, service role key).
- Commit only `*.example` files for env templates.
- Client-side exposure is limited to `NEXT_PUBLIC_*` variables.
- Do not expose Supabase **service role** key to the client.

## Workflow (when adding env vars)
1. **Classify each variable**
   - **Client-public**: must be `NEXT_PUBLIC_*` and safe if exposed.
   - **Server-only**: must never be exposed to the browser; only set in API runtime / secret manager.

2. **Update examples (not real secrets)**
   - Add templates to:
     - root `.env.example`
     - `apps/web/.env.example` (when `apps/web` exists)
     - `apps/api/.env.example` (when `apps/api` exists)

3. **Add a quick leakage check before committing**
   - Ensure `.env`, `.env.*` (non-example), credentials, and connection strings are not staged.
   - If unsure, stop and re-check staged files (do not proceed with commit).

## Project-specific reminders
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public-by-design, but the project’s rule is: **no direct business CRUD from the client**.
- `OPENAI_API_KEY` is **API-side only**.

## Output templates

### Root `.env.example` (minimal)
Use this shape (values are placeholders):

```dotenv
# web (public)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# api (server-only)
SUPABASE_JWT_SECRET=
OPENAI_API_KEY=
```

## Review checklist
- [ ] No secrets are staged/committed.
- [ ] Public vars use `NEXT_PUBLIC_*` only.
- [ ] Server-only vars are not referenced in client code.
- [ ] `.env.example` exists where needed; real `.env` does not get committed.
