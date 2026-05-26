# Proposal: Issue #699 Metric Specs v1 (Ownership + Data Contracts)

## Problem

The approved metric semantics for issue #699 currently exist in discussion form and are not yet encoded as durable OpenSpec artifacts. Without a canonical spec, formula logic, ownership boundaries, source queries, refresh cadence, and required data contracts can drift across implementations.

## Goals

1. Materialize a canonical v1 specification for metrics `C_R`, `O_C`, `V_X`, `A_S`, and `N_E`.
2. Define, for each metric, the normative definition, formula, owner function, source/query, refresh cadence, and required data contracts/dependencies.
3. Preserve function-level ownership in v1 and explicitly defer named DRI assignment to follow-up governance work.
4. Record provenance links that anchor canonical semantics to the approved source discussion.

## Scope

### In scope

- Add OpenSpec change artifacts (`proposal.md`, `tasks.md`, `spec-delta.md`) for issue #699.
- Add a new canonical spec file at `openspec/specs/metric-specs-v1.spec.md`.
- Encode the approved v1 formulas, owner functions, data sources, cadences, and contract dependencies as normative requirements.

### Out of scope

- Assigning named individual DRIs for metric ownership.
- Implementing data pipelines, dashboards, alerts, or enforcement code.
- Altering metric formulas or threshold semantics beyond approved v1 content.

## Deliverables

- `openspec/changes/2026-05-26-issue-699-metric-specs-ownership-data-contracts/proposal.md`
- `openspec/changes/2026-05-26-issue-699-metric-specs-ownership-data-contracts/tasks.md`
- `openspec/changes/2026-05-26-issue-699-metric-specs-ownership-data-contracts/spec-delta.md`
- `openspec/specs/metric-specs-v1.spec.md`

## Provenance

Canonical semantics in this change derive from:

- https://github.com/Conxian/conxian-business/issues/692
- https://github.com/Conxian/conxian-business/issues/692#issuecomment-4452181363
