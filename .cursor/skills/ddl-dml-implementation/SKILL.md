---
name: ddl-dml-implementation
description: Guides implementing Supabase DDL/DML migrations for this project. Use when creating or reviewing `supabase/migrations/*`, when the user mentions DDL/DML, migrations, RLS, constraints, or when starting the database implementation phase.
disable-model-invocation: true
---

# DDL/DML implementation (Supabase migrations)

## Inputs to read first
- `design/database.md`
- `design/tech-stack.md`
- `.cursor/rules/project-rules.md`
- `.cursor/rules/next-step-ddl-checklist.md`
- `.cursor/rules/env-and-secrets.md` (secrets/keys handling)

## Default working rules (do not violate)
- Put DDL in `supabase/migrations/` and keep changes incremental (small, reviewable).
- Follow the order from `.cursor/rules/next-step-ddl-checklist.md`:
  - ENUM → tables → indexes → functions/triggers → RLS.
- Business data CRUD is via FastAPI (not Supabase REST directly). Still keep RLS as a defense layer.
- Never commit secrets; only `.env.example` is allowed.

## Workflow
1. **Establish migration skeleton**
   - Ensure `supabase/migrations/` exists.
   - Decide a file split that maps cleanly to the checklist order (avoid one huge migration).

2. **Implement ENUM types**
   - Create the enums listed in the checklist.
   - Verify enum values match requirements terminology (task status, chat role, etc.).

3. **Implement tables**
   - Create all tables listed in the checklist.
   - Enforce MVP constraints explicitly (examples):
     - One active goal per user (e.g., `goals.user_id` UNIQUE) per `requirements.md` FR-011.
     - Length checks (title/description) consistent with `requirements.md`.
   - Ensure `user_id` is present where required for tenant isolation.

4. **Implement indexes**
   - Add indexes aligned to access patterns (by `user_id`, `goal_id`, ordering fields).
   - Prefer explicit indexes for foreign key columns and common sort/filter columns.

5. **Functions and triggers**
   - If the design specifies it, add:
     - Trigger to create `profiles` on `auth.users` insert.
     - Optional `updated_at` auto-update trigger (only if applied consistently).

6. **RLS and policies**
   - Enable RLS for **all business tables**.
   - Add policies that restrict rows to the authenticated user (typically via `user_id`).
   - Validate that RLS matches the “defense in depth” approach: API layer filters by `current_user_id`, DB layer blocks cross-tenant reads/writes.

7. **Minimal DML**
   - Default to no seed data for MVP unless required for dev-only verification.

## Review checklist (use in PR review)
- [ ] Migration order matches the checklist and is easy to review.
- [ ] Constraints cover MVP rules (1 goal/user, length checks, required fields).
- [ ] RLS enabled everywhere it must be; policies exist and are not overly permissive.
- [ ] No secrets committed; `.env` not added; examples only.
- [ ] Names and terminology match `design/database.md` and `requirements.md`.

## If blocked (missing info)
If a decision cannot be made from the docs, surface the decision as a single bullet with:
- the options,
- the default you will take,
- and where to update the design doc (file + section) if needed.
