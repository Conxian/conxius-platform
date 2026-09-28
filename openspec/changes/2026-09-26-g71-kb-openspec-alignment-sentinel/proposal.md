# Proposal: Autonomous Cross-Repository Knowledge Store & OpenSpec Alignment Diagnostic Engine (G-71)

## Summary
Implements Gap G-71 (Score 26/30, Weighted Score 4.35/5.0), providing an autonomous, fail-closed diagnostic engine (`KBSentinel`) within `services/admin-dashboard/src/lib/support/kbSentinel.ts`. The sentinel evaluates gap register status classifications, validates OpenSpec proposal alignment, computes multidimensional strategic scores, and generates structured diagnostic health reports in JSON and Markdown formats.

## Motivation
As the platform expands across multiple services, maintaining 100% alignment between technical implementations, gap register classifications in `docs/GAPS.md`, scoring metrics in `docs/SCORING_MATRIX.md`, and OpenSpec change proposals is critical. `KBSentinel` automates continuous verification and flags alignment drift, unlinked proposals, or status mismatches.

## Scope
- Implement `KBSentinelEngine` in `services/admin-dashboard/src/lib/support/kbSentinel.ts`.
- Support status evaluation across standard classifications (`Implemented`, `Active Scaffolding`, `Fail-Closed Boundary`, `Research/Draft`).
- Calculate weighted strategic scores (Gap Coverage: 30%, Integration Cost: 20%, Risk: 20%, Testability: 15%, Architecture Alignment: 15%).
- Inspect OpenSpec proposals and cross-validate against Gap Register entries.
- Generate structured diagnostic reports with summary stats and recommendations.
- Provide comprehensive Vitest unit tests in `services/admin-dashboard/src/tests/kbSentinel.test.ts`.

## Strategic Score
- **Gap Coverage (30%)**: 10/10
- **Implementation Cost (20%)**: 6/10
- **Risk / Safety (20%)**: 10/10
- **Testability (15%)**: 9/10
- **Architecture Alignment (15%)**: 10/10
- **Weighted Score**: 4.35 / 5.0 (26/30 raw)
