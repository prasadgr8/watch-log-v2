# AI-Assisted Development Workflow — WatchLog

Watch Log V2 follows the canonical AI-assisted software development workflow maintained in the private repository:

https://github.com/prasadgr8/ai-assisted-development-workflow

## Adopted Version

**Workflow:** AI-Assisted Development Workflow  
**Version:** 1.0  
**Effective:** 2026-09-15

## Purpose

This document establishes that Watch Log V2 adopts the canonical workflow for AI-assisted development.

The canonical workflow repository is the source of truth.

This file is a project-level reference and must not be treated as a duplicate of the canonical workflow.

## Required Milestone Lifecycle

All future WatchLog milestones should follow the canonical workflow:

1. Establish and verify the repository baseline.
2. Create a dedicated feature branch.
3. Implement only the approved milestone scope.
4. Validate the implementation.
5. Verify scope before commit.
6. Commit and verify the resulting SHA.
7. Push the feature branch only.
8. Independently audit the pull request.
9. Merge only after explicit authorization.
10. Verify the merged state independently.
11. Clean up the milestone branch.

## AI Agent Rules

AI agents must not be trusted as the sole source of repository state.

Branch names, commit SHAs, PR state, merge state, and repository state must be independently verified.

## Model Changes

When changing AI models or agents during a milestone, use a model-transition checkpoint and re-establish repository state before continuing.

## Canonical Source

The complete workflow, including detailed gates, recovery procedures, and operating rules, is maintained in the private canonical repository.

Do not duplicate the canonical workflow here.
