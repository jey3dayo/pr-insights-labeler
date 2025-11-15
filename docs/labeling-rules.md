# Labeling Rules Quick Reference

This guide summarizes how PR Insights Labeler assigns each label family. Use it as the first place to check what will be applied to a pull request.

## Label Families

| Family            | Label Prefix   | What It Explains                                      |
| ----------------- | -------------- | ----------------------------------------------------- |
| Size              | `size/*`       | Additions-based PR size labels                        |
| Category          | `category/*`   | Path-based classification of changed files            |
| Risk              | `risk/*`       | Safety assessment based on CI state and change intent |
| Complexity        | `complexity/*` | ESLint cyclomatic complexity evaluation               |
| Policy Violations | `auto/*`       | Workflow limit breaches (file count/size/etc.)        |

All families can be individually enabled via workflow inputs (see `size_enabled`, `category_enabled`, `risk_enabled`, `complexity_enabled`). Labels are additive—multiple families can trigger simultaneously.

## Size Labels (`size/*`)

- Based on total additions after filters (ignores lock files, generated code, docs metadata, and tests).
- Default thresholds:
  - `< 200` → `size/small`
  - `200-499` → `size/medium`
  - `500-999` → `size/large`
  - `1000-2999` → `size/xlarge`
  - `>= 3000` → `size/xxlarge`
- Customize with `size_thresholds` input. Only one size label is applied per PR.

## Category Labels (`category/*`)

- Determined by file path globs. Multiple categories can be set because matching is additive.
- Default mappings (see `docs/categories.md` for full details):
  - Tests (`__tests__/**`, `**/*.test.ts(x)`) → `category/tests`
  - CI/CD (`.github/workflows/**`) → `category/ci-cd`
  - Documentation (`docs/**`, `*.md` excluding specs) → `category/documentation`
  - Config (`*.config.*`, `tsconfig.json`, `action.yml`, etc.) → `category/config`
  - Specs (`.kiro/**`, `specs/**`) → `category/spec`
  - Dependencies (`package.json`, lockfiles) → `category/dependencies`
  - Feature code (`src/features/**`, `src/components/**`) → `category/feature`
  - Infrastructure (`.github/**`, `Dockerfile`, `terraform/**`) → `category/infrastructure`
  - Security (`**/auth*/**`, `.env*`, `secrets/**`) → `category/security`
- Add your own `path_labels` entries for extra categories.

## Risk Labels (`risk/*`)

- Evaluate change impact using CI signals, core path coverage, and commit intent.
- `risk/high` triggers when any CI check fails or when a `feat:*` change touches `src/**` without matching tests (`*.test.ts`, `*.spec.ts`, `__tests__/**`).
- `risk/medium` triggers for configuration-heavy updates (e.g., `.github/workflows/**`, `package.json`, `tsconfig.json`, or any `config_files` glob).
- No risk label is applied for `docs:*`, `test:*`, or `refactor:*` changes with passing CI.
- Configure via the `risk` block in `.github/pr-labeler.yml` (see `docs/configuration.md`).

## Complexity Labels (`complexity/*`)

- Disabled by default; turn on with `complexity_enabled: "true"`.
- Powered by ESLint cyclomatic complexity analysis.
- Defaults:
  - `15-29` → `complexity/medium`
  - `>= 30` → `complexity/high`
- Customize thresholds with `complexity_thresholds` input.

## Policy Violation Labels (`auto/*`)

- Guardrails for workflow policies. Examples include:
  - `auto/large-files` – a single file exceeds `file_size_limit`.
  - `auto/too-many-files` – changed file count exceeds `pr_files_limit`.
  - `auto/too-many-lines` – a file breaks `file_lines_limit`.
  - `auto/excessive-changes` – total additions exceed `pr_additions_limit`.
- Combine with `fail_on_*` inputs to stop workflows when these labels appear.

## Label Auto-Creation

- Labels are automatically created/synchronized (`always-auto-create-labels` spec). Manual color/description inputs were removed; defaults are managed for you.
- Ensure the workflow has `pull-requests: write` permission so label creation succeeds.

## Where to Go Next

- `docs/configuration.md` – All inputs and label customization knobs.
- `docs/categories.md` – In-depth explanations and pattern tables for every category label.
- `docs/advanced-usage.md` – Edge cases (fork PRs, strict policies, localization).
