# Proposal: CON-698 lifecycle/control gates for `conxius-platform` (Issue #721)

Refs #721  
Linear: CON-698

## Problem

`conxius-platform` has partial governance and readiness controls, but it lacks a single implementation bundle that:

1. captures design-impact decisions against the canonical CON-685 lifecycle/control operating model,
2. enforces lifecycle/control controls as machine-checkable CI gates,
3. defines a deterministic verification-evidence refresh/linking path, and
4. updates release/operate readiness expectations for rollback, ownership/escalation, and monitoring.

Without this bundle, gate reviews are harder to reproduce and release readiness can drift across teams.

## Canonical operating-model reference

- https://github.com/Conxian/conxian-business/blob/main/docs/OPERATING_MODEL_LIFECYCLE_CONTROL_OWNERSHIP.md
- Approved source PR: https://github.com/Conxian/conxian-business/pull/702

## Goals

1. Record explicit design-impact decisions for this repository, including outcomes and rationale.
2. Add machine-enforced lifecycle/control gate checks to CI.
3. Establish a clear verification-evidence path (where artifacts live, how to refresh, and what to link).
4. Update release/operate artifacts with rollback, ownership/escalation, and monitoring expectations.

## Scope

### In scope

- Add CON-698 OpenSpec artifacts (`proposal.md`, `tasks.md`, `spec-delta.md`).
- Add a design impact review document aligned to the canonical operating model.
- Add lifecycle/control verification automation (`scripts/verify_lifecycle_control_gates.py`, `scripts/ci/run-lifecycle-control-gates.sh`) and CI workflow integration.
- Add/update runbook and release documentation for evidence lifecycle and operate readiness.

### Out of scope

- Runtime product logic changes in service code.
- Ownership boundary changes across other repositories.
- Secret-management or infrastructure topology changes.

## Deliverables

- `openspec/changes/2026-05-28-con-698-lifecycle-control-gates/proposal.md`
- `openspec/changes/2026-05-28-con-698-lifecycle-control-gates/tasks.md`
- `openspec/changes/2026-05-28-con-698-lifecycle-control-gates/spec-delta.md`
- `docs/architecture/CON-698_LIFECYCLE_CONTROL_DESIGN_IMPACT_REVIEW.md`
- `scripts/verify_lifecycle_control_gates.py`
- `scripts/ci/run-lifecycle-control-gates.sh`
- `.github/workflows/lifecycle-control-gates.yml`
- `docs/runbooks/LIFECYCLE_CONTROL_VERIFICATION_EVIDENCE.md`
- `docs/runbooks/LIFECYCLE_CONTROL_GATE_OPERATIONS.md`
- Updates to `REPO_OWNERSHIP.md`, `RELEASING.md`, and `docs/runbooks/RELEASE_CHECKLIST_TEMPLATE.md`
