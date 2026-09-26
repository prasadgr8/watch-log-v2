# watchlog-product-review

## Purpose

Provide a reusable workflow for performing WatchLog AI Product Review (product
discovery) in **analysis-only** mode and for handing evidence-backed findings
to the mandatory human decision gate.

This Skill governs **how** WatchLog product discovery is performed: repository
state verification, current implementation review, evidence discipline,
duplicate detection, classification, and handoff discipline.

This Skill does **not** define **what** a WatchLog product review analyzes or
outputs. That definition already exists and is owned by:

- `.github/prompts/watchlog-product-review.prompt.md` — the Product Review
  analysis definition (what to analyze and which fields each finding records).

The human decision layer is owned by:

- `docs/development/AI_PRODUCT_REVIEW_HUMAN_GATE.md` — authoritative for the
  transition from a finding to an explicit human decision.

Engineering execution, once work is authorized, is owned by:

- `docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md` — the canonical
  AI-assisted development workflow.

This Skill integrates with those layers. It does not replace, duplicate, or
override any of them.

## When to Use

- When asked to perform a WatchLog product review, product discovery, UX
  discovery, feature-gap analysis, or product-quality analysis.
- When asked what is missing, inconsistent, weak, or worth improving in the
  product.
- Before presenting any finding to a human for a REJECT / DEFER / ACCEPT
  decision.
- Not for implementing, planning, or prioritizing a finding (see Constraints).

## Required Context

- Product Review analysis definition:
  `.github/prompts/watchlog-product-review.prompt.md`.
- Human-gate procedure: `docs/development/AI_PRODUCT_REVIEW_HUMAN_GATE.md`.
- Canonical workflow:
  `docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`.
- Product-authority documentation, as applicable to the area under review:
  `README.md`, `docs/PROJECT_CHARTER.md`, `docs/ARCHITECTURE.md`,
  `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/future-enhhancements.md`,
  `docs/UI_GUIDELINES.md`, `docs/DATABASE.md`.
- Current repository state, verified directly (not from prior agent claims).
- GitHub Issues and GitHub Project information, where available, read-only.

## Workflow

1. **Confirm analysis-only mode.** Product discovery produces findings. It does
   not implement findings. A finding is discovery input, not an implementation
   request, a requirement, an accepted feature, or a confirmed bug. Verify that
   the requested task is a review. If the task asks for implementation, STOP
   (see Stop Conditions).

2. **Verify the actual repository state.** Independently confirm branch, HEAD
   SHA, working tree, and any diff using Git commands. Do not rely on prior
   agent statements about repository state. Do not assume functionality is
   missing merely because it is not visible in the UI or in documentation.

3. **Review the current implementation before proposing anything.** Inspect the
   relevant source, components, services, repositories, domain logic, routes,
   tests, and documentation for the area under review. State which of the
   following applies to each finding: implemented, partially implemented,
   planned, deferred, rejected, or genuinely missing.

4. **Require evidence for every finding.** Each finding must cite concrete,
   verifiable repository or product artifacts — as applicable: file, component,
   service, domain module, test, documentation, GitHub Issue or Project item, or
   recent Git history. Label each statement as one of:
   - **Observed fact** — directly verified in the repository or product.
   - **Inference** — a reasoned conclusion that was not directly verified.
   - **External/user-facing observation** — reported or observed behavior that
     is not verifiable from the repository alone.

   Never present inference as fact. Evidence categories irrelevant to a
   particular finding are not required for that finding.

5. **Perform duplicate detection before reporting a finding.** Search relevant
   existing coverage across all of the following:
   1. current implementation
   2. tests
   3. `docs/ROADMAP.md`
   4. `docs/CHANGELOG.md`
   5. future-enhancement / backlog documentation
      (`docs/future-enhhancements.md`)
   6. relevant GitHub Issues
   7. relevant GitHub Project items
   8. relevant Git history

   If existing work already covers the finding, reference the existing item
   instead of reporting a duplicate. Record the duplicate-check result with the
   finding, including the sources checked where no coverage was found.

6. **Classify each finding** using the established Product Review
   classifications (see Finding Classifications). Do not invent additional
   classifications. Classification describes the nature of a finding, not its
   priority.

7. **Do not rank, score, or prioritize.** The AI must not rank findings, score
   findings, assign priority, declare a best or worst opportunity, recommend
   which finding should be implemented, decide which finding should be accepted,
   or predict product value as a basis for autonomous prioritization. Evidence
   and findings are the AI's output; product decisions belong to humans.

8. **Hand findings to the human gate.** Every finding is presented for an
   explicit human decision under
   `docs/development/AI_PRODUCT_REVIEW_HUMAN_GATE.md`. The available human
   outcomes are exactly:
   - `REJECT` — consciously not accepted; the finding is not carried forward.
   - `DEFER` — potentially useful but intentionally postponed.
   - `ACCEPT` — consciously accepted as a valid product consideration and
     backlog candidate.

   Do not invent additional outcomes. Do not make the decision.

   **`ACCEPT` does not mean implementation approval.** Acceptance means only
   that the human has accepted the finding for further consideration and for
   progression through the appropriate governance gates. Issue creation, Project
   placement, roadmap scope, architecture approval, prioritization, and
   implementation each remain separate, later, human-controlled gates.

9. **Prepare the finding record for human review.** Each finding should contain
   enough information for a human to decide, as applicable:
   - finding ID
   - finding title
   - classification
   - observed problem or opportunity
   - current behavior and current implementation status
   - evidence, with observed fact / inference / external observation labeled
   - affected product area
   - duplicate-check result and existing references, or an explicit note that
     none were found
   - dependencies, architecture impact, and risks where applicable
   - uncertainty / confidence
   - relevant supporting references
   - human-gate decision required (REJECT / DEFER / ACCEPT)

   The full analysis-and-output definition — including all required finding
   fields and review sections — remains owned by
   `.github/prompts/watchlog-product-review.prompt.md`; this Skill does not
   restate or duplicate it. Findings must not be converted into implementation
   tasks, and must not be presented as instructions to implement.

10. **Mutate nothing.** Product discovery only produces analysis and findings.
    The Skill must not autonomously mutate:
    - GitHub Issues
    - GitHub Projects
    - `docs/ROADMAP.md`
    - architecture documentation
    - `docs/CHANGELOG.md`
    - future-enhancement / backlog documentation
    - source code
    - tests
    - implementation files

    Any subsequent mutation requires the appropriate human authorization and the
    corresponding governance gate, under the canonical workflow
    (`docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`).

## Finding Classifications

Use only these established Product Review classifications:

- `BUG`
- `UX IMPROVEMENT`
- `ACCESSIBILITY`
- `PERFORMANCE`
- `ARCHITECTURE`
- `FEATURE ENHANCEMENT`
- `NEW FEATURE`
- `PRODUCT OPPORTUNITY`

No classification carries an implied priority or order.

## Human-Gate Handoff

`docs/development/AI_PRODUCT_REVIEW_HUMAN_GATE.md` is authoritative for the
transition from a finding to a human decision.

```text
AI Product Discovery (this Skill)
        ↓
Structured Finding
        ↓
Human Review
        ↓
REJECT / DEFER / ACCEPT
        ↓
(separate human-controlled gates: Issue, Project, roadmap, architecture,
 prioritization, then the canonical implementation workflow)
```

This Skill stops at the point of handoff. It does not perform the human
decision, and it does not act on a decision.

## Constraints

- **Analysis only.** This Skill never implements findings, and never treats a
  finding as approved work.
- **No autonomous mutation.** GitHub Issues, GitHub Projects, `docs/ROADMAP.md`,
  architecture documentation, `docs/CHANGELOG.md`, future-enhancement / backlog
  documentation, source code, tests, and implementation files must not be
  created, modified, closed, moved, or deleted by this Skill.
- **No ranking, scoring, or prioritization** of findings. No "best" or "worst"
  opportunity, no recommended implementation order, no autonomous acceptance.
- **No invented outcomes or classifications.** Only the eight established
  classifications and only the three human-gate outcomes (REJECT / DEFER /
  ACCEPT) apply. `ACCEPT` is a product consideration decision, not
  implementation approval.
- **No duplication of existing governance.** The Product Review analysis
  definition is `.github/prompts/watchlog-product-review.prompt.md`. The human
  decision layer is `docs/development/AI_PRODUCT_REVIEW_HUMAN_GATE.md`. The
  engineering workflow is
  `docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`. Consult these
  documents rather than restating them.
- **No silent governance reconciliation.** If terminology or outcomes differ
  between governance artifacts (for example between the human-gate procedure and
  the Issue template `.github/ISSUE_TEMPLATE/ai-product-opportunity.md`), do not
  modify, align, or reinterpret any governance file. Report the difference as an
  observation requiring a separate authorized human decision.
- **Verified evidence only.** Never report a finding without verifiable
  evidence, and never present inference as fact.
- This Skill does not create branches, commits, pull requests, Issues, or
  Project items, and does not commit, push, merge, or approve changes.

## Stop Conditions

STOP and report the condition — instead of continuing or guessing — when:

- evidence is insufficient to support a finding
- the repository state is ambiguous or inconsistent
- a possible finding appears to be a duplicate, or duplicate status is unclear
- the classification of a finding is unclear
- the scope of the finding or the proposed direction is unclear
- the finding cannot be distinguished from existing planned or deferred work
- a human decision has not yet been made
- a proposed mutation would require human authorization
- the request crosses into implementation, planning, or prioritization
- required repository or GitHub evidence cannot be verified
- governance artifacts appear to conflict and would require reconciliation

A STOP condition must never be resolved by guessing, by mutating repository,
Issue, or Project state, or by proceeding to the next gate. Report the actual
state and wait for human instruction.

## Completion Criteria

- Findings are evidence-backed, with observed facts distinguished from
  inference and external observation.
- Duplicate detection was performed and recorded for each finding.
- Each finding carries exactly one established classification.
- No ranking, scoring, or prioritization was applied.
- Each finding is presented for a REJECT / DEFER / ACCEPT decision together with
  the review information required by the Product Review definition.
- No repository, Issue, Project, roadmap, changelog, architecture,
  documentation, source, or test artifact was mutated.

## Expected Output

- Structured findings under the Product Review definition in
  `.github/prompts/watchlog-product-review.prompt.md`.
- For each finding: classification, current implementation status, evidence with
  fact/inference labeling, affected area, duplicate-check result,
  uncertainty/confidence, and supporting references.
- An explicit handoff to the human gate
  (`docs/development/AI_PRODUCT_REVIEW_HUMAN_GATE.md`) stating that a
  REJECT / DEFER / ACCEPT decision is required.
- Any STOP conditions encountered, reported instead of resolved.

> This Skill stops at the human gate. Issue creation, Project placement,
> roadmap and architecture decisions, prioritization, and implementation each
> require separate explicit human authorization under the canonical workflow
> (`docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`).
