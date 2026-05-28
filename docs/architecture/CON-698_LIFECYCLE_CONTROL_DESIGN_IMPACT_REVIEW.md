# CON-698 Design Impact Review: Lifecycle/control gates for `conxius-platform`

Refs: #721, CON-698

## Canonical operating model reference

This design impact review is aligned to:

- https://github.com/Conxian/conxian-business/blob/main/docs/OPERATING_MODEL_LIFECYCLE_CONTROL_OWNERSHIP.md
- https://github.com/Conxian/conxian-business/pull/702

## Decision summary

| Decision ID | Decision | Outcome | Rationale |
| --- | --- | --- | --- |
| D-1 | Keep `conxius-platform` ownership bounded to composition/runtime/integration-harness control surfaces. | **Approved** — no ownership transfer for business logic, canonical adapters, or wallet UX semantics. | Preserves boundary contract and avoids control-plane logic drift into non-owning repositories. |
| D-2 | Make lifecycle/control gates machine-enforced for this repository. | **Approved** — `check:lifecycle-control` runs a deterministic gate bundle and is wired to CI. | Human-only checklist review was insufficiently reproducible for release discipline. |
| D-3 | Standardize verification evidence production and linking. | **Approved** — gate runs write evidence under `test-results/lifecycle-control-gates/`; docs define refresh + link requirements. | Evidence freshness and traceability must be explicit for Verify/Release/Operate gates. |
| D-4 | Add explicit release/operate ownership, escalation, rollback, and monitoring expectations for lifecycle/control gates. | **Approved** — runbook and release docs now codify owner-of-record (`@conxian/core-devs`), escalation, rollback, and monitoring checkpoints. | Operate gates (`OPS-1`, `OPS-2`) require clear accountability and deterministic failure handling. |

## Lifecycle gate impact matrix for `conxius-platform`

| Lifecycle gate | Repository impact outcome | Evidence anchor |
| --- | --- | --- |
| `DISC-1`, `DISC-2` | Boundary impact and control-domain classification must be captured before implementation. | This design-impact review + OpenSpec change bundle under `openspec/changes/2026-05-28-con-698-lifecycle-control-gates/` |
| `DES-1`, `DES-2` | Ownership and design decisions are fixed in documentation prior to runtime/workflow changes. | This document + `spec-delta.md` |
| `BLD-1`, `BLD-2` | Build-time lifecycle/control checks are deterministic and machine-run (`check:lifecycle-control`). | `scripts/ci/run-lifecycle-control-gates.sh`, `.github/workflows/lifecycle-control-gates.yml` |
| `VER-1`, `VER-2` | Verification outputs are captured as reproducible artifacts and linked in review records. | `docs/runbooks/LIFECYCLE_CONTROL_VERIFICATION_EVIDENCE.md`, `test-results/lifecycle-control-gates/` |
| `REL-1`, `REL-2` | Release documentation requires lifecycle/control evidence and owner sign-off before promotion. | `RELEASING.md`, `docs/runbooks/RELEASE_CHECKLIST_TEMPLATE.md` |
| `OPS-1`, `OPS-2` | Operate posture includes owner/escalation map, monitoring expectations, and rollback actions for failing gates. | `docs/runbooks/LIFECYCLE_CONTROL_GATE_OPERATIONS.md`, `REPO_OWNERSHIP.md` |
| `IMP-1`, `IMP-2` | Gate failures/drift are tracked and reflected into docs/check scripts as corrective updates. | `docs/runbooks/LIFECYCLE_CONTROL_GATE_OPERATIONS.md` (`Continuous improvement`) |

## Explicit boundary outcomes

1. No protocol/business logic ownership is introduced in `conxius-platform` as part of CON-698.
2. CI gate additions are documentation/control enforcement only and do not alter runtime service behavior.
3. Evidence artifacts are generated as verification traces; they are not production secrets and must remain redaction-safe.
