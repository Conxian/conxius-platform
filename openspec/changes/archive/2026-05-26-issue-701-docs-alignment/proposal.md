# Proposal: Issue #701 documentation alignment and theory-reference restoration

## Problem
- `docs/CONXIAN_UNIFIED_THEORY_v2.md` is missing, leaving stale references without a canonical destination.
- `README.md` carries status/version wording that can drift from other status documents.
- Status framing across `README.md`, `GAPS.md`, `WHITEPAPER.md`, and `SYNERGY.md` can be interpreted as competing baselines.

## Decision
- Restore `docs/CONXIAN_UNIFIED_THEORY_v2.md` as a concise canonical index that links to authoritative architecture, alignment, and status documents.
- Normalize `README.md` status wording to factual transition language and point operational status to `GAPS.md` and `openspec/changes/`.
- Apply minimal framing edits in `GAPS.md`, `WHITEPAPER.md`, and `SYNERGY.md` to reduce drift and clarify source-of-truth boundaries.

## Non-goals
- Any product logic, API, or runtime behavior changes.
- Any new release, performance, or milestone claims.
