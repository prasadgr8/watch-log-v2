# watchlog-release

## Purpose

Provide the final pre-merge readiness verification for a WatchLog pull
request. Determine technical readiness and gate human merge authorization.

## When to Use

- After `watchlog-review` has produced its verdict.
- Before requesting merge authorization.
- As the final checkpoint before "HUMAN AUTHORIZATION → MERGE".

## Required Context

- `watchlog-feature` output (changed files, scope).
- `watchlog-testing` output (test/lint/build results with actual evidence).
- `watchlog-review` findings and verdict.
- Current Git state (verified directly).
- The PR description (if a PR has been drafted).

## Workflow

1. **Verify Git state.** Confirm:
   - Current branch is a feature branch (not `main`).
   - HEAD matches the latest local commit on the feature branch.
   - Working tree is clean (or known uncommitted changes are intentional).
   - Base branch is `main`.

2. **Verify branch / base relationship.** Confirm:
   - The feature branch was created from `main`.
   - `git diff main...HEAD` shows only the intended feature changes.
   - No merge commits on the feature branch (linear history).

3. **Verify intended scope.** Run `git diff --stat` and confirm:
   - Only files within the approved milestone blast radius are changed.
   - No secrets, credentials, or environment files are included.
   - No unrelated dependency or configuration changes.

4. **Verify tests.** Confirm:
   - `watchlog-testing` reports that `npm run test` was run.
   - Actual test output is available (not just a claim).
   - No tests were weakened or removed.
   - Baseline test coverage is maintained or grows.

5. **Verify build.** Confirm:
   - `npm run build` was run (includes `tsc` typecheck + Vite production build).
   - Actual build output is available.
   - No type errors, no build failures.

6. **Verify lint.** Confirm:
   - `npm run lint` was run.
   - Actual lint output is available.
   - No new errors introduced (pre-existing router warnings are acceptable
     per `docs/CHANGELOG.md`).

7. **Verify review findings.** Confirm:
   - All P0 findings from `watchlog-review` are resolved.
   - All P1 findings are resolved or explicitly accepted with justification.
   - P2/P3 findings are documented (may be deferred).

8. **Verify absence of unresolved blockers.** Confirm:
   - No failing validation commands.
   - No P0 review findings.
   - No scope violations.
   - No merge conflicts with `main`.

9. **Identify documentation requirements.** Confirm:
   - If user-facing functionality was added, a documentation reconciliation
     is planned (to be tracked as a follow-up, not necessarily in this PR,
     per project convention).
   - If database schema changed, `docs/DATABASE.md` is flagged for update.
   - If UI conventions changed, `docs/UI_GUIDELINES.md` is flagged for update.

10. **Identify changelog/roadmap requirements.** Confirm:
    - A CHANGELOG entry is planned for the next documentation reconciliation
      milestone (not necessarily in this PR, per project convention).
    - The ROADMAP milestone status is tracked for the next reconciliation.

11. **Verify PR readiness.** Confirm:
    - PR description is clear: summary of changes, test results, scope.
    - PR references the correct milestone.
    - No leftover debugging code or temporary files.

12. **Produce readiness verdict.** Clearly state:

    **TECHNICALLY READY:** YES / NO

    With evidence for each check above (pass/fail + actual command output).

13. **State the authorization gate.** Explicitly declare:

    > Merge requires **explicit human authorization**. This Skill does not
    > merge, push, or rewrite history. The human reviewer must approve and
    > merge the pull request after this readiness check passes.

## Constraints

- Does **not** merge.
- Does **not** push.
- Does **not** rewrite history.
- Does **not** bypass review findings.
- Does **not** declare success without evidence (must show actual command
  output).
- Does **not** override human approval.
- Reports actual evidence, not assumptions or agent claims.

## Stop Conditions

- All 13 checklist items verified with actual evidence.
- Readiness verdict produced (technically ready YES/NO).
- Documentation and changelog requirements identified.
- Human authorization gate explicitly stated as pending.
- Report is complete.

## Expected Output

- Readiness checklist (each item: ✅ or ❌ + evidence)
- Outstanding documentation/changelog requirements
- Readiness verdict: **TECHNICALLY READY: YES / NO**
- Explicit statement: **"Human authorization required before merge."**

> This Skill verifies readiness only. Merge is a human decision.
> See `docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md` —
> steps 9 (merge only after explicit authorization) and 10 (verify
> merged state).
