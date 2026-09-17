# watchlog-feature

## Purpose

Provide a reusable workflow for implementing an approved WatchLog feature
or milestone safely, from baseline verification through implementation
and local validation.

## When to Use

- At the start of any WatchLog implementation task.
- After the task prompt has defined the objective, scope, and acceptance criteria.
- Before writing any application code.

## Required Context

- The task/milestone prompt (defines **what** to build — not this Skill).
- Current Git state (verified directly, not from prior agent claims).
- Authoritative project documentation: `docs/ARCHITECTURE.md`, `docs/DATABASE.md`,
  `docs/UI_GUIDELINES.md`, `docs/PROJECT_CHARTER.md`.
- The canonical AI-assisted development workflow:
  `docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`.

## Workflow

1. **Verify repository baseline.** Confirm the current branch, HEAD SHA, and
   clean working tree using `git status` and `git log`. Do not assume prior
   agent claims about repository state.

2. **Identify the appropriate feature branch.** Confirm the branch matches the
   current milestone's descriptive name (e.g., `feature/add-tmdb-adapter`).
   If the branch does not exist, create it from `main`. Do not work directly
   on `main`.

3. **Understand the approved task scope.** Re-read the task prompt's objective,
   requirements, scope, and acceptance criteria. Product requirements come from
   the task prompt — do not invent them.

4. **Inspect existing implementation before changing anything.** Search for
   relevant code: existing repositories, services, domain types, components,
   and test files. Read tests as behavior specifications.

5. **Consult authoritative architecture documentation.** Check
   `docs/ARCHITECTURE.md` for routing, offline-first patterns,
   repository/service separation, and data ownership rules. Check
   `docs/DATABASE.md` for schema versioning and migration rules. Check
   `docs/UI_GUIDELINES.md` for UI conventions and reusable components.

6. **Identify affected areas and blast radius.** Trace data flow: which
   stores, repositories, services, components, and routes will be touched.
   Determine whether any IndexedDB schema changes are needed (avoid them if
   possible — the domain layer should be preferred for new business logic).

7. **Search for reusable abstractions.** Look for existing utilities,
   components, service patterns, domain types, and repository methods to
   extend rather than duplicate. Consult the "Reusable Components" list in
   `docs/UI_GUIDELINES.md`.

8. **Produce a minimal implementation plan.** List the files to create or
   modify, the entry and exit points, and the data flow. Keep the plan
   proportional to the approved scope.

9. **Implement only the approved scope.** Follow existing conventions:
   - Feature-based organization under `src/features/`
   - Pure business logic in `src/domain/`
   - Data access via `src/database/repositories/`
   - Typed models in `src/types/`
   - Services own business logic; repositories own data access
   - Watch Log V2 is offline-first; IndexedDB is authoritative; external
     (TMDB) data is enrichment only and must be mapped to internal models

10. **Preserve established architecture and boundaries.** Do not:
    - Persist raw external API responses in IndexedDB
    - Modify the database schema unless the task explicitly requires it
    - Bypass repository layers for direct Dexie table access
    - Introduce provider-specific types into the domain layer
    - Break existing offline-first behavior

11. **Validate locally.** Run the project's actual validation commands
    (from `package.json`):
    - `npm run test`
    - `npm run lint`
    - `npm run build`

    Report the actual pass/fail output. Do not claim results you did not verify.

12. **Verify the resulting scope/diff.** Run `git diff --stat` to confirm
    only files within the approved blast radius were modified.

13. **Report.** Summarize:
    - What was changed (file list)
    - What validation was run and its actual results
    - What was explicitly excluded from scope
    - Handoff to `watchlog-testing` and `watchlog-review`

## Constraints

- Product requirements, acceptance criteria, and scope come **only** from the
  task/milestone prompt. This Skill provides the **process**, not the
  requirements.
- Do **not** invent requirements or expand scope beyond what is approved.
- Do **not** perform unrelated refactoring or modify unrelated files.
- Do **not** modify `.clinerules`, permanent project documentation, or
  configuration files outside the approved scope.
- **Do not commit.**
- **Do not push.**
- **Do not merge.**
- **Do not approve a PR.**
- Consult authoritative documentation instead of restating architectural rules.

## Stop Conditions

- Implementation matches the approved scope.
- `npm run test`, `npm run lint`, and `npm run build` all pass (actual output verified).
- `git diff --stat` confirms no files outside the intended blast radius were modified.
- A summary report is produced.

## Expected Output

- List of changed files
- Actual test/lint/build results (pass/fail with evidence)
- Scope verification (`git diff --stat`)
- Explicit handoff to `watchlog-testing` and `watchlog-review`

> This Skill stops before commit. Commit and push are governed by
> `.clinerules` rule 3 and the canonical AI-assisted development workflow
> (`docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`).
