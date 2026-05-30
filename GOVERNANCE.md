# Governance

This repository is governed by Conxian Labs and uses a pull-request-first workflow.

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

## Cross-repository control alignment

- Chain-specific deployment/operator repositories (including Conxius Orbit in `Conxian/conxius-orbit`) must align to the parent lifecycle/control model defined by this repository.
- This alignment is an operational policy baseline only; it does not transfer code-review/merge authority across repositories.
- Operator setup and deployment-policy changes in those repositories must reference a parent control-plane issue/spec and use parent-approved runbook evidence.
- Trust assumption: operator surfaces are treated as untrusted by default and must never require protocol-signing key custody.
- Scope boundary: deployment/operator repositories must not expand into broad protocol ownership; protocol-state/business-logic changes remain in their owning repositories.

## Branch and promotion guidance (current repo)

- `main` is the default branch.
- Use short-lived feature/fix branches and merge via pull request to `main`.
- Cut releases from tagged commits (`vX.Y.Z`) after required checks pass.
