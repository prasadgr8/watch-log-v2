# watchlog-testing

## Purpose

Provide a reusable workflow for deriving, implementing, executing, and
investigating tests for WatchLog changes.

## When to Use

- When writing tests for a new or modified feature.
- When running regression tests.
- When investigating and diagnosing test failures.
- After `watchlog-feature` has produced a change set and before
  `watchlog-review` performs its independent audit.

## Required Context

- `watchlog-feature` output (list of changed files, scope, acceptance criteria).
- `package.json` (for validation command names).
- `vitest.config.ts` (test environment configuration).
- `src/test/setup.ts` (test setup: fake-indexeddb, deterministic database cleanup).
- Authoritative project documentation as needed
  (`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/UI_GUIDELINES.md`).

## Workflow

1. **Derive test scenarios from acceptance criteria.** For each requirement in
   the task prompt, identify:
   - Happy path
   - Edge cases
   - Error paths
   - Regression coverage
   - Data integrity concerns
   - Offline/online behavior (where relevant)
   - API/integration behavior (where relevant)
   - UI/accessibility behavior (where relevant)

2. **Choose the appropriate test type.**
   - **Unit test** — Pure domain logic, service functions, utilities.
     No IndexedDB required. Mock external dependencies.
   - **Integration test** — Repository operations, multi-store transactions.
     Uses the fake-indexeddb environment provided by `src/test/setup.ts`.
   - **Service test** — Service orchestration with mocked repositories.
   - **UI behavior test** — Colocated `*.test.ts` files (existing project pattern).

3. **Follow existing project test conventions.**
   - Colocated `*.test.ts` files alongside the source they test.
   - `describe` / `it` / `expect` from Vitest.
   - `restoreMocks`, `clearMocks`, `mockReset` are enabled globally
     via `vitest.config.ts` — do not re-enable them.
   - Database cleanup between tests is handled by `src/test/setup.ts`
     — do not duplicate it in individual test files.

4. **Cover edge cases.**
   - Empty state (no media, no episodes, no watch history).
   - Missing or partial data.
   - Malformed input.
   - Boundary conditions (e.g., Season 0 special episode handling per
     `docs/ARCHITECTURE.md`).
   - Large data sets where performance/timeout is a concern.

5. **Cover error paths.**
   - Network failures (TMDB API errors, timeouts).
   - Offline scenarios (`useOnlineStatus` gating).
   - IndexedDB transaction failures.
   - Invalid or unexpected provider responses.

6. **Verify data integrity.**
   - Watch-state preservation during TMDB metadata synchronization.
   - No duplicate records created.
   - Transactional all-or-nothing behavior for multi-store operations.
   - Migration backfill correctness (if schema changes are involved).

7. **Verify offline/online behavior.**
   - Local-first rendering from IndexedDB.
   - TMDB enrichment gated by reactive online state.
   - Offline notices via `role="status"`, error alerts via `role="alert"`.

8. **Verify accessibility where applicable.**
   - `aria-label` / `aria-labelledby` on interactive controls.
   - `role="progressbar"` with value attributes (via shared `ProgressBar`).
   - `focus-visible` focus rings and skip-link patterns.
   - Conventions from `docs/UI_GUIDELINES.md`.

9. **Run the project's actual validation commands.**
   - `npm run test` — Full test suite. Report the actual count and any
     failures. Do not reference a hardcoded target count.
   - `npm run lint` — Linting. Report any errors.
   - `npm run build` — Typecheck (`tsc`) + production build. Report any errors.

10. **Investigate failures.** When a test fails:
    - Determine whether the **implementation** is wrong or the **test** is wrong.
    - Fix the actual problem — not the test surface.
    - Report the evidence: what failed, root cause analysis, and the fix applied.
    - Never weaken or remove a test merely to make the suite pass.

11. **Report.** Include:
    - Test execution results (actual output).
    - Coverage summary for the change set.
    - Any failures, their investigation, and resolution.
    - Handoff to `watchlog-review`.

## Constraints

- Do **not** become a replacement for `ARCHITECTURE.md`, `DATABASE.md`, or
  `UI_GUIDELINES.md`. Reference these documents; do not copy their content.
- Do **not** define feature requirements — that is the task prompt's role.
- Do **not** perform the independent engineering review — that is
  `watchlog-review`'s role.
- Do **not** commit, push, merge, or approve a PR.

## Stop Conditions

- Test scenarios cover acceptance criteria, edge cases, and error paths.
- `npm run test` passes with actual output verified.
- `npm run lint` passes (if applicable to the change).
- `npm run build` passes.
- Any failures are investigated and the actual root cause is fixed.
- A summary report with actual evidence is produced.

## Expected Output

- Test results (actual `npm run test` output).
- Coverage summary for the changed files.
- Failure investigation report (if any failures occurred).
- Pass/fail status for each validation command with evidence.
