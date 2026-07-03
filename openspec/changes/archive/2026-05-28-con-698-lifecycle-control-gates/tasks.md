# Tasks: CON-698 lifecycle/control gates for `conxius-platform` (Issue #721)

## Implementation checklist

- [x] Create CON-698 OpenSpec change artifacts (`proposal.md`, `tasks.md`, `spec-delta.md`).
- [x] Add a design-impact review document aligned to CON-685 lifecycle/control ownership guidance.
- [x] Add a machine-enforced lifecycle/control gate verifier script and CI entrypoint script.
- [x] Add CI workflow wiring for lifecycle/control gates and artifact upload.
- [x] Add explicit verification-evidence refresh/linking guidance.
- [x] Update release/operate readiness artifacts for rollback, ownership/escalation, and monitoring.
- [x] Run lifecycle/control gate checks locally and capture command-level pass/fail results.

## Requirement-to-evidence map

| Issue #721 acceptance criterion | Implemented evidence | Verification evidence |
| :--- | :--- | :--- |
| Design impact review decisions completed against operating model | `docs/architecture/CON-698_LIFECYCLE_CONTROL_DESIGN_IMPACT_REVIEW.md` (decision table + lifecycle gate matrix) | `python3 scripts/verify_lifecycle_control_gates.py` validates required design-review markers and references |
| Lifecycle/control build checks defined in CI and passing | `.github/workflows/lifecycle-control-gates.yml`, `scripts/ci/run-lifecycle-control-gates.sh`, `scripts/verify_lifecycle_control_gates.py` | `pnpm run check:lifecycle-control` local run summary in `test-results/lifecycle-control-gates/summary.md` |
| Verification evidence captured/linked | `docs/runbooks/LIFECYCLE_CONTROL_VERIFICATION_EVIDENCE.md` | `pnpm run check:lifecycle-control` generates `test-results/lifecycle-control-gates/` artifacts and documented link requirements |
| Release/operate readiness artifacts updated (rollback, ownership/escalation, monitoring) | `docs/runbooks/LIFECYCLE_CONTROL_GATE_OPERATIONS.md`, `REPO_OWNERSHIP.md`, `RELEASING.md`, `docs/runbooks/RELEASE_CHECKLIST_TEMPLATE.md` | `python3 scripts/verify_lifecycle_control_gates.py` validates required rollback/escalation/monitoring + release-checklist anchors |

## Acceptance criteria (testable)

- [x] **AC-1 (design impact):** explicit repository decisions are documented with outcomes and rationale against the canonical CON-685 model.
  - **Pass when:** design review doc includes decision-focused outcomes/rationale and lifecycle gate impact mapping.
  - **Fail when:** only descriptive text exists without explicit decisions/outcomes.

- [x] **AC-2 (CI lifecycle/control checks):** lifecycle/control checks are executable locally and from CI.
  - **Pass when:** workflow invokes lifecycle/control script and the script fails on missing required artifacts.
  - **Fail when:** checks are manual or non-deterministic.

- [x] **AC-3 (verification evidence path):** evidence locations + refresh/link instructions are explicit.
  - **Pass when:** runbook defines `test-results/lifecycle-control-gates/`, refresh command(s), and PR/issue linking expectations.
  - **Fail when:** evidence path depends on tribal knowledge.

- [x] **AC-4 (release/operate readiness):** rollback, ownership/escalation, and monitoring expectations are codified.
  - **Pass when:** readiness docs include explicit owner, escalation path, rollback plan, and monitoring checkpoints.
  - **Fail when:** release/operate expectations remain implicit.
