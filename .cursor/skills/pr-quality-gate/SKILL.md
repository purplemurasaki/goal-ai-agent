---
name: pr-quality-gate
description: Ensures pull requests follow this repo's PR rules and template. Use when creating PRs, drafting PR descriptions, reviewing PR readiness, or when the user mentions PR, pull request, review, or merge conditions.
disable-model-invocation: true
---

# PR quality gate

## Inputs to read
- `.cursor/rules/project-rules.md`
- `.github/pull_request_template.md`
- `.cursor/rules/env-and-secrets.md`
- `design/procedure.md` (branching expectations)

## Goals
- PR description includes the required sections and is complete.
- Changes are scoped and testable.
- No secrets or generated artifacts are included.

## Workflow (when asked to create or review a PR)
1. **Confirm branch and scope**
   - Work should be on `feature/*` branched from `develop`.
   - Summarize what the PR changes in 1–3 bullets.

2. **Populate PR body using the repo template**
   - Use the structure from `.github/pull_request_template.md` as the source of truth.
   - Ensure it includes at minimum:
     - purpose / background
     - changes
     - test steps
     - impact / affected areas (DB/FE/BE/infra)

3. **Readiness checks**
   - CI is expected to be green (when workflows exist / are enabled).
   - Confirm no secrets are staged/committed (see `.cursor/rules/env-and-secrets.md`).
   - Call out any follow-ups (out of scope) explicitly.

## Output format
When producing a PR description, output **only** the PR title and body in markdown.

### Title guideline
- Prefer the repo's commit prefix style in spirit (e.g. `docs:`, `feat:`, `fix:`), but keep it PR-appropriate and human readable.

### Body template (fill these)
```markdown
## 目的 / 背景

## 変更内容
- 

## テスト手順
- [ ] 

## 影響範囲
- [ ] DB
- [ ] FE
- [ ] BE
- [ ] infra

## 補足
```

## Common issues to catch
- Missing test plan.
- Impact area not checked.
- PR includes `.env` or any secrets.
- PR changes mix unrelated concerns (ask to split).
