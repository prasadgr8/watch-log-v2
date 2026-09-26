# AI Product Review — Human-Gate Procedure

## Purpose

This document defines the mandatory human decision process between AI Product Review
analysis and normal WatchLog backlog and development work.

An AI Product Review finding is:

- an evidence-backed observation
- discovery input
- a candidate for human consideration

A finding is **not** automatically a requirement, an accepted feature, a confirmed bug,
or approved implementation work. Only an explicit human decision moves a finding forward,
one gate at a time.

## Relationship to the canonical workflow

The canonical development process is `docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`
(AI-Assisted Development Workflow v1.0). That document remains authoritative for engineering
execution: baseline → feature branch → controlled implementation steps → validation →
commit → push → independent PR audit → human authorization → merge → post-merge
verification → milestone branch cleanup.

This procedure is the product-discovery-to-human-decision gate that occurs before normal
engineering implementation begins. It does not duplicate and does not override the
canonical workflow.

Product Review behavior itself is defined by the established Step 1 governance files:

- `.github/copilot-instructions.md`
- `.github/prompts/watchlog-product-review.prompt.md`
- `.github/ISSUE_TEMPLATE/ai-product-opportunity.md`

## Lifecycle

```text
AI Product Review
→ Structured Finding
→ Human Review
→ REJECT / DEFER / ACCEPT
→ If accepted: GitHub Issue
→ Human backlog placement
→ Human prioritization
→ Ready for planning
→ Architecture / roadmap decision where applicable
→ Normal WatchLog development workflow
```

Each arrow is a distinct decision gate. A finding does not move forward automatically,
and not every accepted finding passes through every later layer — backlog placement,
prioritization, roadmap, and architecture gates apply only where relevant.

## 1. Product Review is analysis-only

The AI Product Review:

- analyzes the product
- identifies evidence-backed findings
- detects duplicates and already-covered work
- records uncertainty
- does not decide product priorities
- does not accept its own findings
- does not modify product-authority artifacts automatically

It must not implement findings, create or modify GitHub Issues, modify the GitHub
Project, modify `ROADMAP.md`, modify `CHANGELOG.md`, or autonomously initiate
implementation.

## 2. A finding is not a requirement

A Product Review finding is evidence-backed input for human evaluation. It carries no
authority on its own. Nothing becomes work, scope, or roadmap content merely because a
review produced it.

## 3. Evidence requirement

Every finding must be supported by appropriate repository or product evidence. Relevant
evidence may include, as applicable to the finding:

- current implementation
- tests
- architecture documentation
- roadmap
- changelog
- future enhancements
- GitHub Issues
- GitHub Project
- recent repository history
- existing UX or product behavior

Evidence categories that are irrelevant to a particular finding are not required for it.

## 4. Mandatory duplicate detection

Before a finding can reach the human decision gate, the reviewer must check for existing
coverage across, as applicable:

1. current implementation
2. `ROADMAP.md`
3. `CHANGELOG.md`
4. `docs/future-enhhancements.md`
5. existing GitHub Issues
6. GitHub Project
7. relevant recent Git history

If existing work already covers the finding, the existing item must be referenced rather
than producing a duplicate. Duplicate-check results are recorded with the finding.

## 5. Finding classification

Every finding must be classified using the established Product Review categories:

- BUG
- UX IMPROVEMENT
- ACCESSIBILITY
- PERFORMANCE
- ARCHITECTURE
- FEATURE ENHANCEMENT
- NEW FEATURE
- PRODUCT OPPORTUNITY

No ranking or scoring is introduced here. Classification describes the nature of a
finding, not its priority.

## 6. Human decision gate

Every finding reaching the gate receives exactly one explicit human outcome:

| Outcome | Meaning |
| --- | --- |
| **REJECT** | Consciously not accepted. The finding is not carried forward. |
| **DEFER** | Potentially useful but intentionally postponed. |
| **ACCEPT** | Consciously accepted as a valid product consideration and backlog candidate. |

There is no automatic acceptance path. ACCEPT requires an explicit decision by the human
reviewer or project owner.

**ACCEPT does not mean implementation approval.** Acceptance means only that the human
has accepted the finding as a valid product consideration and backlog candidate.

## 7. Issue creation is a separate gate

Accepting a finding does not automatically authorize creating a GitHub Issue. Issue
creation is a separate, explicit human-controlled action.

When an Issue is created, it should preserve the relevant finding information so origin
and rationale remain traceable:

- original finding ID
- finding classification
- evidence
- current behavior
- user problem or opportunity
- suggested direction
- affected area
- dependencies
- architecture impact
- complexity
- risks
- duplicate-check evidence
- confidence
- human decision

The existing issue template `.github/ISSUE_TEMPLATE/ai-product-opportunity.md`
supports this record.

## 8. GitHub Project placement is a separate gate

Issue creation does not automatically mean Project placement.

- Project placement requires its own human decision and action.
- Project status changes are human-controlled.
- AI must not autonomously move a finding into Ready or In Progress, or add, move, or
  remove Project items.
- No automatic Project workflow is prescribed beyond what already exists in the
  repository.

## 9. Roadmap decision is separate

```text
Finding acceptance ≠ Roadmap acceptance
```

A candidate backlog item may exist without ever being added to the roadmap. Acceptance
does not confer roadmap scope. `ROADMAP.md` remains a human-controlled product-authority
artifact; AI must not modify it.

## 10. Architecture decision is separate

```text
Product acceptance ≠ Architecture approval
```

When a candidate affects architecture, persistence, domain boundaries, offline behavior,
provider integrations, or other architectural constraints, architecture review must occur
before implementation planning. `ARCHITECTURE.md` remains a human-controlled authority.

## 11. Implementation follows the canonical workflow

Once a candidate has been accepted, sufficiently planned, and explicitly authorized for
implementation by the human, the work enters the canonical development workflow defined
in `docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`: baseline → feature branch →
controlled implementation steps → validation → commit → push → independent PR audit →
human authorization → merge → post-merge verification → cleanup. That workflow is not
reproduced here and remains authoritative for all engineering execution.

## 12. Rejected and deferred findings remain traceable

Rejected and deferred findings must not silently disappear from the decision history.
Where a decision record exists, the outcome and rationale are preserved. The three
outcomes are all conscious decisions: REJECT is consciously not accepted, DEFER is
consciously postponed, and ACCEPT is consciously accepted for further product
consideration.

## 13. No AI ranking

> AI Product Review must not rank, score, prioritize, or select findings on behalf of
> the human decision-maker.

The review may provide evidence and describe implications, dependencies, risks, and
uncertainty. Human prioritization remains authoritative.

## 14. Decision layers

```text
AI Product Discovery
        ↓
Human Product Decision
        ↓
Backlog / Issue Decision
        ↓
Project Placement / Status Decision
        ↓
Roadmap Decision
        ↓
Architecture Decision
        ↓
Engineering Implementation
```

Each transition is a distinct decision gate. A finding that stops at any gate ends there;
later layers are not implied, and not every accepted finding must pass through every
layer.

## 15. Decision authority table

| Stage | Responsible authority | AI allowed? | State mutation allowed? |
| --- | --- | --- | --- |
| Product discovery | AI Product Review, analysis-only | Yes | No — analysis and reporting only |
| Human product decision | Human reviewer / project owner | No — AI may present evidence only | No — decision recorded; no automatic acceptance |
| Issue creation | Human reviewer / project owner | No | Yes — only on explicit human instruction |
| Project placement / status | Human reviewer / project owner | No | Yes — only by explicit human action |
| Roadmap decision | Human reviewer / project owner | No — AI may provide analysis only | Yes — only by explicit human action |
| Architecture decision | Human reviewer / project owner, with architecture review before implementation planning | No — AI may provide analysis only | Yes — only by explicit human decision |
| Engineering implementation | AI agent under the canonical workflow, gated by human authorization at each step | Yes — within the currently approved stage only | Yes — per the canonical workflow gates |

## 16. Minimum Acceptance Evidence

Before an ACCEPT decision is recorded, verify:

- [ ] finding has a clear classification
- [ ] current behavior / problem is documented
- [ ] evidence is identified
- [ ] duplicate search was performed
- [ ] existing related work is referenced (or explicitly noted as absent)
- [ ] affected area is identified
- [ ] dependencies / risks are identified where applicable
- [ ] uncertainty is explicitly recorded where applicable
- [ ] human decision is explicitly recorded

## 17. STOP conditions

STOP and do not proceed to the next gate when:

- duplicate status is unclear
- evidence is insufficient
- existing implementation contradicts the finding
- roadmap status is unclear
- Project status is unclear
- architecture impact is unclear
- repository state is inconsistent
- the requested action exceeds the current approved stage
- human decision has not been made
- scope of the proposed mutation is unclear

Report the condition and wait for human instruction. A STOP condition must never be
resolved by mutating repository, Issue, or Project state.

## 18. Worked lifecycle example (hypothetical)

The following example is illustrative only. It does not create, reference, or imply a
real backlog item.

1. **AI Product Review** analyzes the product in analysis-only mode and reports a
   structured finding classified `UX IMPROVEMENT` describing a hypothetical first-run
   dashboard experience. Evidence points at the current dashboard implementation and
   observed empty-state behavior. The duplicate check across implementation, roadmap,
   changelog, future enhancements, issues, Project, and recent history is recorded with
   the finding (illustratively: no existing coverage found). Confidence and uncertainty
   are stated explicitly.
2. **Human review** — the human reviewer or project owner evaluates the finding against
   the Minimum Acceptance Evidence checklist and chooses **ACCEPT** (or REJECT or
   DEFER).
3. **Issue creation** — separately, the human decides whether to open a GitHub Issue
   using `.github/ISSUE_TEMPLATE/ai-product-opportunity.md`, preserving the finding ID,
   classification, evidence, duplicate-check results, and the recorded human decision.
4. **Project placement** — separately, the human decides whether the Issue enters the
   GitHub Project and in which status. Nothing moves automatically.
5. **Prioritization** — the human prioritizes the candidate among backlog items; no AI
   ranking applies.
6. **Roadmap / architecture gates** — where applicable, the human separately decides
   roadmap scope and whether architecture review is required.
7. **Implementation** — only after acceptance, planning, and explicit human
   authorization does the work enter the canonical workflow
   (`docs/development/AI_ASSISTED_DEVELOPMENT_WORKFLOW.md`).
