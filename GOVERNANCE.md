# Governance

This repository is governed by Conxian Labs and uses a pull-request-first workflow.

## Lane Model: Governance Baseline, Live Execution, and Historical Context

This repository operates three distinct governance lanes that must not be collapsed into one another. The lane model is a practical bridge between the governance rules below and the four-tier [Information Hierarchy](./docs/INFORMATION_HIERARCHY.md) (canonical → operational → evidence → historical).

> **Org-Level Security**: See [`.github/ORG_SECURITY_GOVERNANCE.md`](.github/ORG_SECURITY_GOVERNANCE.md) for org-wide GitHub rulesets, push protection requirements, and security posture controls.

### 1. Governance Baseline Lane (*how and why we govern*)

The governance baseline is the set of policies, contracts, and control rules that define how this repository is managed. It lives in:

- This file ([`GOVERNANCE.md`](./GOVERNANCE.md))
- [`CODEOWNERS`](./CODEOWNERS) — authoritative ownership and review assignment
- [`SECURITY.md`](./SECURITY.md) — vulnerability reporting and disclosure
- [`REVIEWS.md`](./REVIEWS.md) — code review standards
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — contribution workflow and issue routing
- [`RELEASING.md`](./RELEASING.md) — release and versioning discipline
- [`RELEASE_POLICY.md`](./RELEASE_POLICY.md) — release promotion cycle and LTS gate policy
- [`RELEASE_CONTROL.md`](./RELEASE_CONTROL.md) — portfolio release control path, repo classification, and minimum release controls per risk class
- [`docs/REPO_BOUNDARY_CONTRACT_V1.md`](./docs/REPO_BOUNDARY_CONTRACT_V1.md) — cross-repository ownership boundaries
- [`docs/PRODUCTION_BOUNDARY.md`](./docs/PRODUCTION_BOUNDARY.md) — production boundary and operator-safety constraints
- [`.github/ORG_SECURITY_GOVERNANCE.md`](.github/ORG_SECURITY_GOVERNANCE.md) — org-wide GitHub rulesets and push protection
- [`.github/ORG_EXCEPTIONS.md`](.github/ORG_EXCEPTIONS.md) — approved exceptions to org security requirements

Changes to governance baseline documents must follow the OpenSpec-first model and are reviewed by the owners mapped in `CODEOWNERS`. These documents are the *source of truth* for how the repository is operated; they are never overridden by live execution artifacts or historical context.

### 2. Live Issue-Execution Lane (*what we are doing right now*)

The live execution lane is where active development work happens. It lives in:

- GitHub Issues and Pull Requests on this repository
- OpenSpec proposals under [`openspec/changes/`](./openspec/changes/)
- CI workflow definitions in [`.github/workflows`](./.github/workflows)
- Operational tracking documents: [`GAPS.md`](./docs/GAPS.md), [`SCORING_MATRIX.md`](./docs/SCORING_MATRIX.md), runbooks

Live execution artifacts are ephemeral by nature — issues close, PRs merge, runbooks evolve. They derive their authority from the governance baseline and may not supersede it. When a live execution artifact (e.g., a runbook update) needs to change a policy, the change must flow through the governance baseline update path.

### 3. Historical Context Lane (*what happened before*)

Historical context preserves institutional memory without competing with live governance truth. It lives in:

- [`docs/archived-reports/`](./docs/archived-reports/) — superseded alignment reports, phase reviews, scorecards
- [`docs/archived-tasks/`](./docs/archived-tasks/) — completed enhancement plans and task summaries
- [`docs/archived-scripts/`](./docs/archived-scripts/) — superseded maintenance scripts
- [`openspec/changes/archive/`](./openspec/changes/archive/) — archived OpenSpec proposals

Historical documents are **strictly read-only**. They must never be cited as authority for current decisions, must never appear in active reading chains, and must not be updated in place. If a historical document contains information that needs revision, create a new document in the appropriate active lane and archive the old one per the [Information Hierarchy](./docs/INFORMATION_HIERARCHY.md) archival process.

| Aspect | Governance Baseline | Live Execution | Historical Context |
| :--- | :--- | :--- | :--- |
| **Purpose** | Define rules and policies | Execute active work | Preserve past state |
| **Mutability** | Change via OpenSpec proposal | Ephemeral; flows per workflow | Immutable (read-only) |
| **Authority** | Authoritative for decisions | Derived from baseline | None for current decisions |
| **Influences** | Live execution lane | Nothing (feeds into baseline) | Nothing (read-only) |
| **Examples** | `GOVERNANCE.md`, `CODEOWNERS`, `SECURITY.md` | GitHub Issues, PRs, runbooks, `GAPS.md` | `archived-reports/`, `archived-tasks/` |

### Lane Overlap Prevention

- **A governance baseline document** that becomes stale is updated via an OpenSpec proposal, not overridden by a live execution artifact.
- **A live execution artifact** (issue, PR, runbook) that disagrees with the governance baseline is out of alignment and must be corrected — the baseline wins.
- **A historical document** that appears to conflict with current practice has no authority; its content is preserved for reference but must not influence active decisions.
- **Repository sweeps and audits** that produce reports are classified as historical evidence once published. They inform future governance baseline updates through the OpenSpec path but do not directly modify live execution priorities.

## Ownership

- Root [`CODEOWNERS`](./CODEOWNERS) is the authoritative source for repository code-review and merge ownership.
- Governance, security, and policy changes should be reviewed by the owners mapped in `CODEOWNERS`.

## Change control

- All code and documentation changes must land through pull requests.
- Work should follow the OpenSpec-first model described in [`CONTRIBUTING.md`](./CONTRIBUTING.md).
- Keep changes scoped, reviewable, and linked to the relevant issue/spec where applicable.

## Security, contributing, and license

- Contributing guide: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Security reporting and policy: [`SECURITY.md`](./SECURITY.md)
- License: [`LICENSE`](./LICENSE)

## Repository boundary

`conxius-platform` is the declarative control plane repository for the Conxian ecosystem. It owns the orchestration and operator surfaces, while core protocol logic remains in its respective source repositories. See [`docs/PRODUCTION_BOUNDARY.md`](./docs/PRODUCTION_BOUNDARY.md).

## Cross-repository control alignment (ITIL V5 Root-to-Leaf)

- Chain-specific deployment/operator repositories (including Conxius Orbit in `Conxian/conxius-orbit`) must align to the parent lifecycle and root-to-leaf control model (ITIL V5) defined by this repository.
- This alignment is an operational policy baseline only; it does not transfer code-review/merge authority across repositories.
- Operator setup and deployment-policy changes in those repositories must reference a parent control-plane issue/spec and use parent-approved runbook evidence.
- Trust assumption: operator surfaces are treated as untrusted by default and must never require protocol-signing key custody.
- Scope boundary: deployment/operator repositories must not expand into broad protocol ownership; protocol-state/business-logic changes remain in their owning repositories.

## Branch and promotion guidance (current repo)

- `main` is the default branch and the production-ready surface.
- The portfolio release cycle uses `dev` → `release/x.y` → `main` per [`RELEASE_POLICY.md`](./RELEASE_POLICY.md).
- Feature and fix branches merge into `dev` via pull request with required CI and review.
- Release branches (`release/x.y`) are cut from `dev` for stabilisation and promoted to `main` after all promotion gates pass.
- `lts/*` branches carry extended maintenance commitments per the LTS Gate Policy.
- Cut releases from tagged commits (`vX.Y.Z`) on `main` after required checks pass.
- Branch lifecycle and protection rules are defined in [`docs/BRANCH-MAINTENANCE.md`](./docs/BRANCH-MAINTENANCE.md).
