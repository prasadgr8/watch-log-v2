# Step 2C — First Product Review — Human-Gate Decision Record

**Status:** DECISION RECORD — recorded. No implementation is authorized by this document.
**Milestone:** Step 2 — AI Product Review Governance
**Step:** Step 2C — First Product Review
**Gate:** Human-Gate Decision Record only
**Baseline:** `main` @ `12fa7db893dacb42ab6050c9664ee8733ceb6f5f` (= `origin/main`)
**Created under:** explicit human authorization limited to creating this single artifact.

Governing references (authoritative; this record does not restate or override them):

- Product review workflow: `.cline/skills/watchlog-product-review/SKILL.md`
- Product review analysis definition: `.github/prompts/watchlog-product-review.prompt.md`
- Human decision layer: `docs/development/AI_PRODUCT_REVIEW_HUMAN_GATE.md`
- Engineering execution: `docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`

Naming: this file follows the established `docs/development` artifact convention
`<PREFIX>_<UPPER_SNAKE_ARTIFACT>.md` (compare `A26.3_IMPLEMENTATION_PLAN.md`,
`A26.5_IMPLEMENTATION_PLAN.md`, `AI_PRODUCT_REVIEW_HUMAN_GATE.md`).

## 1. Purpose and scope of this record

Step 2C performed the first WatchLog product discovery review in analysis-only mode
and produced 16 findings, each presented to the human gate with the required
`REJECT / DEFER / ACCEPT` decision. The human reviewer then:

1. approved three foundational product decisions (Q1 durability promise,
   Q2 movie runtime and watch time, Q3 export/data portability); and
2. recorded an explicit `REJECT / DEFER / ACCEPT` outcome for all 16 findings.

This document records those decisions and the rationale supplied with them. It is a
**decision record**, not a second review report. It does not reproduce the Step 2C
review body. The review findings, their evidence, their duplicate checks, their
uncertainty statements, and the mutation audit remain with the Step 2C review output
as emitted under the governing procedures above.

This artifact creates no work, no scope, no backlog item, and no authorization.

## 2. Verified repository baseline

- Branch: `main`.
- HEAD: `12fa7db893dacb42ab6050c9664ee8733ceb6f5f` (merge of PR #131, the merged
  Product Discovery Skill).
- `origin/main`: identical to HEAD; divergence `0  0` (ahead/behind).
- Working tree: clean (no modified, staged, or untracked files) before this artifact
  was created.
- Product Discovery Skill blob on `main`:
  `.cline/skills/watchlog-product-review/SKILL.md` = `eea1ac9ef45c7d8f34fda8589f6d4aee98e97aff`
  (the Step 2B approved version).
- Human-gate procedure present: `docs/development/AI_PRODUCT_REVIEW_HUMAN_GATE.md`.
- Product review prompt present: `.github/prompts/watchlog-product-review.prompt.md`.
- Step 2C review was executed read-only; the mutation audit accompanying it reported
  all-NONE/NO/NOT DONE (no files, Issues, Projects, roadmap, architecture, changelog,
  source, or tests changed; no commit, push, PR, or merge).

### 2.1 Evidence corrections recorded at this gate

One evidence citation from the review output was corrected during preparation of this
record. The correction does not change any finding, classification, or decision:

- The export milestone records are Project items titled `WL-801`, `WL-802`, `WL-803`.
  The corresponding GitHub Issues are **#63, #55, #57**, verified **CLOSED as
  COMPLETED** (2026-08-04) with Project status **Done**. Where the review output
  referred to "issues #801-#803", the verified issue numbers are #63/#55/#57.

## 3. Source review

- Step 2C discovery review output: 16 findings (`F-2C-01` … `F-2C-16`), eight
  established classifications (BUG, UX IMPROVEMENT, ACCESSIBILITY, PERFORMANCE,
  ARCHITECTURE, FEATURE ENHANCEMENT, NEW FEATURE, PRODUCT OPPORTUNITY), each with
  evidence, duplicate-check result, uncertainty, and a required human decision.
- Review repository state: identical to the baseline in section 2.
- The review recorded the following counts for context (not decisions): 16 findings;
  45 open / 25 closed GitHub Issues; Project #1 "Project Orion — Watch Log V2
  Development" observed at 24 × `Done` and 1 × `Backlog`.

## 4. Decision semantics preserved by this record

Three distinct levels are deliberately kept separate, per
`docs/development/AI_PRODUCT_REVIEW_HUMAN_GATE.md`:

| Level | Meaning | What it is not |
| --- | --- | --- |
| **Product consideration** | The finding or question was evaluated by the human reviewer. | Not a requirement, not a bug confirmation, not scope. |
| **Accepted finding** | The human recorded `ACCEPT`: a valid product consideration and backlog candidate. | Not implementation approval; not roadmap scope; not a Project entry. |
| **Implementation authorization** | A separate, later, explicitly authorized gate under the canonical workflow. | Not granted by this record at any level, for any finding. |

**ACCEPT does not authorize implementation.** No `ACCEPT` recorded below authorizes
code, documentation, roadmap, architecture, database, backup, Issue, Project, or
branch work. Issue creation (`HUMAN_GATE` §7), Project placement (§8), roadmap scope
(§9), architecture approval (§10), and implementation (§11) are each separate gates
requiring their own explicit human authorization.

## 5. Approved foundational product decisions

These three decisions are the basis for several finding outcomes and are recorded
verbatim in intent.

### Q1 — WatchLog durability promise

**Approved direction: B — best-effort local storage plus explicit durability
communication.**

Recorded scope:

- WatchLog remains offline-first / local-first.
- The local-storage and durability model must be explicitly communicated.
- Persistent-storage awareness may be considered.
- A backup-freshness / last-backup indicator may be considered.
- **Automated or scheduled backup is NOT approved by this decision.**
- **Cloud sync is NOT approved by this decision.**
- These points must not be converted into implementation tasks by this record.

### Q2 — Movie runtime and watch time

**Approved direction: A — watch time remains episode-runtime based.**

Recorded scope:

- Current watch-time semantics are intentional.
- Movie counts and movie status remain separate from episode-runtime watch time.
- **`F-2C-14` is REJECTED as a product finding.**
- No movie-runtime schema change is authorized.
- No architecture, database, or backup change is authorized.

### Q3 — Export and data portability

**Approved direction: A — the full JSON backup is the canonical WatchLog export
mechanism.**

Recorded scope:

- The existing versioned JSON backup is the canonical export contract.
- No CSV, interchange, or partial-export feature is approved by this decision.
- **`F-2C-15` is REJECTED.**
- The unreachable competing media-only export contract is cleanup/consolidation scope
  under `F-2C-11`, **not** a second export product.
- No cleanup implementation is authorized by this step.

## 6. Recorded human-gate disposition (all 16 findings)

Summary of recorded outcomes: **ACCEPT 9** (`F-2C-02, 03, 04, 07, 08, 10, 11, 12, 16`),
**DEFER 5** (`F-2C-01, 05, 06, 09, 13`), **REJECT 2** (`F-2C-14, 15`). The listing
below is in finding-ID order; it is not a ranking, a score, or a priority.

### F-2C-01 — BUG — **DEFER**

Reason (as authorized): the missing-TMDB-credential behavior depends on the intended
deployment contract. Defer until the supported deployment/self-hosting model is
explicitly established. Credential failure handling must not be implemented as part of
this decision record.

Basis (from the Step 2C review): module-scope credential throw in the TMDB client
configuration path; no runtime configuration or degradation path.

### F-2C-02 — BUG — **ACCEPT**

Reason: database readiness/failure handling is a legitimate product-quality concern
independently of the other findings.

Basis: database initialization failure surfaced only to the console; no
`blocked`/`versionchange` handling; local-only persistence as the sole source of truth.

### F-2C-03 — UX IMPROVEMENT — **ACCEPT**

Reason: route/application-level error recovery is a legitimate product-quality gap.

Basis: no route `errorElement` and no application-level error boundary; all routes are
lazily loaded.

### F-2C-04 — UX IMPROVEMENT — **ACCEPT**

Reason: URL-backed search state is a concrete usability/discoverability improvement and
is not currently covered by active product tracking.

Basis: search state is component-only; a session-only limitation is recorded only in
stale release notes and is absent from roadmap/backlog/tracker.

### F-2C-05 — UX IMPROVEMENT — **DEFER**

Reason: settings information architecture is an observed structural concern, but
perceived severity has not been validated through user evidence.

Basis: one settings page holding five sections with no in-page navigation.

### F-2C-06 — UX IMPROVEMENT — **DEFER**

Reason: the decorative notification bell was an intentional prior accessibility/design
decision. Reconsideration is deferred rather than silently reversing that decision.

Basis: the prior milestone deliberately made the bell non-interactive and recorded that
choice; notifications remain deferred.

### F-2C-07 — ACCESSIBILITY — **ACCEPT**

Reason: statistic-card heading semantics represent a concrete accessibility concern.

Basis: metric value rendered as the heading and the metric label left unassociated,
across a heavily reused card component.

### F-2C-08 — ACCESSIBILITY — **ACCEPT**

Reason: per-route document title/page-context behavior represents a concrete
accessibility/navigation concern.

Basis: no per-route document title, and no route-change focus/scroll context reset.

### F-2C-09 — PERFORMANCE — **DEFER**

Reason: the scalability characteristic is observed, but real-world large-library impact
is unmeasured. Existing duplicate performance Issues #21 and #31 should not be acted
upon in this step.

Basis: full-collection reads and in-memory derivation in the dashboard/statistics paths;
duplicate issues already exist in the tracker.

### F-2C-10 — ARCHITECTURE / PRODUCT RISK — **ACCEPT**

**Narrow scope (as authorized):** storage durability awareness / persistent-storage
handling and explicit communication only. Cloud sync and broader synchronization are
NOT included.

Reason: this aligns with the approved durability direction (Q1 = B) while preserving the
offline-first architecture.

Basis: no persistent-storage request, no eviction/quota handling, and no durability
communication anywhere in the repository.

### F-2C-11 — ARCHITECTURE — **ACCEPT**

**Narrow scope (as authorized):** accepted for cleanup/consolidation consideration,
including the unreachable milestone artifacts and the competing export contract.
Deletion or cleanup must NOT be performed in this step.

Reason: the finding is accepted as a correctness/consolidation concern; execution is a
separate gate.

Basis: unreachable export service and download utility left behind by the export
milestone (Issues #63/#55/#57, titles `WL-801`/`WL-802`/`WL-803`, CLOSED as COMPLETED),
with no consumers and no tests.

### F-2C-12 — FEATURE ENHANCEMENT — **ACCEPT**

Reason: search pagination is a concrete capability gap and the existing TMDB service
contract already supports paging.

Basis: the paged TMDB client exposes paging while the search UI consumes only the first
page of results.

### F-2C-13 — PRODUCT OPPORTUNITY — **DEFER**

Reason: availability region expansion requires additional product/audience/coverage
evidence. The region catalogue must not be expanded automatically.

Separate note recorded as authorized: the hard-coded `IN` default region and broader
region coverage are **distinct questions** for future consideration, not one decision.

Basis: single-region availability support with a hard-coded default and a narrow
selectable catalogue.

### F-2C-14 — PRODUCT OPPORTUNITY — **REJECT**

Reason: watch time remains intentionally episode-runtime based (Q2 = A). Current
behavior is documented and disclosed. No movie-runtime data-model change is authorized.

Basis: movie runtime is absent from the movies data model; movie runtime contributes
zero to watch time by design; the statistics UI already discloses that movie runtime is
unavailable; watch time is derived from episode runtime.

### F-2C-15 — NEW FEATURE — **REJECT**

Reason: the existing full JSON backup is the canonical export mechanism (Q3 = A). No
additional export or interchange capability is approved by this decision.

Basis: the versioned JSON backup is the complete documented export/restore surface;
there is no tracked user demand for CSV/interchange export.

### F-2C-16 — PRODUCT OPPORTUNITY — **ACCEPT**

**Narrow scope (as authorized):** backup freshness / last-backup visibility only.
Automated or scheduled backup is NOT accepted as implementation scope by this decision.

Reason: this follows the approved durability direction (Q1 = B) while avoiding an
unapproved PWA/background automation architecture change.

Basis: no backup-freshness signal is surfaced to the user; backup remains entirely
manual.

## 7. Narrow scope boundaries (as explicitly authorized)

| Finding | Outcome | Effective scope | Explicitly excluded by this record |
| --- | --- | --- | --- |
| `F-2C-10` | ACCEPT (narrow) | Storage durability awareness / persistent-storage handling / explicit durability communication | Cloud sync; broader synchronization; scheduled backup |
| `F-2C-11` | ACCEPT (narrow) | Cleanup/consolidation consideration, including unreachable milestone artifacts and the competing export contract | Any deletion or cleanup execution in this step |
| `F-2C-16` | ACCEPT (narrow) | Backup freshness / last-backup visibility | Automated or scheduled backup; any PWA/background automation |

An `ACCEPT` with a narrow scope means: the consideration is accepted **only** within the
stated boundary. All other `ACCEPT` findings (`F-2C-02`, `03`, `04`, `07`, `08`, `12`)
carry no scope narrowing in this record, but equally carry no implementation
authorization (section 4).

## 8. Rejected product findings

Two findings are recorded as **REJECT** as product findings, each because the approved
foundational decision establishes the current behavior as intentional:

- **`F-2C-14` — REJECT** under Q2 = A. Watch time remains episode-runtime based; movie
  counts/status stay separate; no movie-runtime schema, architecture, database, or
  backup change is authorized. This rejection means the observed behavior is accepted as
  designed and disclosed — not that a defect was fixed.
- **`F-2C-15` — REJECT** under Q3 = A. The versioned JSON backup is the canonical export
  contract; no CSV/interchange/partial export is approved. The unreachable competing
  media-only export contract is cleanup/consolidation scope under `F-2C-11`
  (accepted, not implemented), not a second export product.

## 9. Unresolved governance and documentation observations (separate from this gate)

The following observations were raised alongside the Step 2C review and remain
**unresolved**. They are recorded here only to preserve visibility. This artifact
creates no decision, scope, or mutation for any of them.

- **G-1** — Issue-template decision vocabulary mismatch: unresolved.
- **G-2** — Stale/duplicate Issues: unresolved.
- **G-3** — Project coverage: unresolved.
- **G-4** — Release-notes/changelog drift: unresolved.
- **G-5** — Server-oriented acceptance criteria / planning-artifact drift: unresolved.
- **G-6** — Stale database documentation: unresolved.

**G-1 through G-6 require separate authorized governance/hygiene gates and are NOT part
of this Step 2C decision-record mutation.** No tracker hygiene, documentation
reconciliation, or issue cleanup is authorized here.

## 10. Authorization boundaries of this gate

This gate authorized **exactly one mutation**: creating this decision-record file.

**No** Issue, Project, `ROADMAP.md`, `ARCHITECTURE.md`, `DATABASE.md`, `CHANGELOG.md`,
future-enhancements, source, test, configuration, or implementation change is authorized
by this gate. No implementation plan is created. No branch is created. Nothing is
staged, committed, pushed, or merged. No PR is opened. No branch is deleted. No stale
Issue is cleaned up. No G-1 through G-6 observation is reconciled. No accepted finding is
implemented. No `DEFER` finding is activated. No `REJECT` finding is re-opened by this
record.

Subsequent Issue creation, Project placement, roadmap scoping, architecture approval,
documentation changes, and implementation each require **separate explicit human
authorization** under the canonical workflow
(`docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`) and the gate structure in
`docs/development/AI_PRODUCT_REVIEW_HUMAN_GATE.md` (§7-§11).

Decisions recorded here are durable records of human judgement. Changing any recorded
outcome requires a new explicit human decision; it is not an AI-observable correction.

## 11. Artifact validation record

- Exactly one new file created: `docs/development/A2C_PRODUCT_REVIEW_DECISION_RECORD.md`.
- No existing file modified, and no file deleted.
- `git diff --check` clean (no whitespace or conflict-marker errors).
- Content check: 3 foundational decisions present (Q1, Q2, Q3); 16 finding outcomes
  present (`F-2C-01` … `F-2C-16`); vocabulary limited to `REJECT` / `DEFER` / `ACCEPT`;
  narrow scopes recorded for `F-2C-10`, `F-2C-11`, `F-2C-16`; `F-2C-14` and `F-2C-15`
  recorded as REJECT; G-1 through G-6 recorded as unresolved and separated; STOP
  condition present.
- Branch remains `main`; HEAD remains `12fa7db893dacb42ab6050c9664ee8733ceb6f5f`;
  `origin/main` unchanged; divergence `0  0`.
- Working tree contains only this new artifact as an addition.
- No commit, no push, no PR, no merge, no branch operation, no GitHub state change.

## 12. STOP

**STOP — Step 2C decision record complete.**

Do not proceed to any Issue, Project, roadmap, architecture, documentation-hygiene,
G-1…G-6 reconciliation, or implementation step — and do not commit or push this
artifact — without a new explicit human authorization.
