# watchlog-review

## Purpose

Provide an independent pre-PR engineering review of an implemented and
tested WatchLog change set.

## When to Use

- Before creating a pull request.
- After `watchlog-feature` and `watchlog-testing` have completed.
- As an independent audit of the change, separate from the implementer's
  perspective.

## Required Context

- `watchlog-feature` output (changed files, scope, validation results).
- `watchlog-testing` output (test results, failure investigations).
- The actual diff: `git diff --stat` and `git diff`.
- Authoritative project documentation as needed.

## Workflow

1. **Diff audit (scope discipline).** Run `git diff --stat` and verify only
   files within the approved blast radius were modified. Flag unexpected
   files (secrets, config, dependency updates, unrelated features).

2. **Functional correctness.** Verify the implementation matches the
   acceptance criteria from the task prompt. Check for logic errors,
   off-by-one issues, and missing null/undefined guards.

3. **Architecture compliance.** Verify:
   - Repository/service separation is respected
     (repositories own data access; services own business logic; domain
     logic lives in `src/domain/`).
   - Offline-first pattern is preserved
     (IndexedDB is the source of truth; external data is enrichment only).
   - External API responses are mapped to internal domain models before
     persistence or use — not stored or propagated raw.

4. **Repository/service boundaries.** Verify:
   - No service layer writes to IndexedDB directly.
   - Repositories encapsulate all Dexie table access.
      - Domain types are provider-neutral (no external response types leak
     into `src/domain/`).

5. **Domain model integrity.** Verify:
   - Types are consistent with `src/types/`.
   - No circular dependencies introduced.
   - Domain logic remains pure where existing patterns are pure.

6. **IndexedDB / data integrity.** Verify:
   - No unnecessary schema changes (consult `docs/DATABASE.md`).
   - Any migration is additive with backfill logic.
   - No silent data loss on migration.
   - Watch-state preservation during any sync or update path.
   - Transactional all-or-nothing for multi-store writes.

7. **External API boundaries.** Verify:
   - Provider API responses are mapped to internal types immediately.
   - No external response types are exposed to or consumed by domain code.
   - Network calls are gated by online state (`useOnlineStatus`).
   - Error handling covers timeouts, rate limits, and service unavailability.

8. **Security / privacy.** Verify:
   - No secrets, tokens, or credentials in code.
   - API keys provided through Vite environment configuration and excluded from Git.
   - No sensitive user data is logged or exposed.

9. **Performance.** Verify:
   - No blocking synchronous operations on the main thread.
   - Repository queries use appropriate indexes (consult `docs/DATABASE.md`).
   - No N+1 query patterns in service-layer loops.

10. **Accessibility / UX (where relevant).** Verify per
    `docs/UI_GUIDELINES.md`:
    - `role="alert"` for error states.
    - `role="status"` for async announcements.
    - `aria-label` / `aria-labelledby` for interactive controls.
    - `focus-visible` focus rings and skip-link patterns.
    - Accessible heading hierarchy (`h1` &rarr; `h2` &rarr; `h3`).

11. **Maintainability.** Verify:
    - Code follows existing naming and structure conventions.
    - No duplicated logic (search for existing implementations first).
    - Appropriate level of abstraction.
    - Comments explain *why*, not *what*.

12. **Backward compatibility.** Verify:
    - Existing functionality is not broken.
    - No breaking changes to public APIs or data models.
    - Existing tests remain valid.

13. **Regression risk.** Identify areas where the change could cause
    regressions in other features or integrations.

14. **Unnecessary changes.** Flag:
    - Formatting-only changes.
    - Commented-out code.
    - Dead code.
    - Temporary debug statements.

15. **Classify findings and produce verdict.**

### Severity Model

| Level | Label | Criteria |
|---|---|---|
| **P0** | Blocking / Critical | Correctness bugs, data loss risk, architecture violations, security issues, broken tests |
| **P1** | Important | Maintainability issues, accessibility regressions, performance concerns, scope violations |
| **P2** | Minor | Style inconsistencies, naming issues, missing doc comments |
| **P3** | Suggestion | Future improvement ideas not required for this change |

### Verdict

- **PASS** — No findings, or only P2/P3 findings that are acceptable.
- **PASS WITH FINDINGS** — P2/P3 findings present; no P0/P1.
- **CHANGES REQUIRED** — One or more P0 or P1 findings must be addressed.

## Constraints

- This review is **independent** — must not be conducted by the same
  implementer who wrote the code.
- Does **not** automatically modify code to resolve findings.
- Does **not** make the final merge decision — that is `watchlog-release`'s
  role and ultimately requires human authorization.
- Does **not** duplicate the full testing workflow. Verifies testing was
  performed and reviews the change.
- Must verify evidence (diffs, test output, git state) directly.

## Stop Conditions

- All 15 checklist items reviewed.
- Findings classified by severity.
- Verdict produced with rationale.
- Findings table produced with file locations and descriptions.

## Expected Output

- Findings table: severity | file/area | description | recommendation
- Verdict (PASS / PASS WITH FINDINGS / CHANGES REQUIRED)
- Rationale for the verdict
- Handoff to `watchlog-release` (if verdict is PASS or PASS WITH FINDINGS)
