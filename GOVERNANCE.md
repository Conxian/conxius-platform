# Governance

This repository is governed by Conxian Labs and uses a pull-request-first workflow.

## Ownership

- Repository ownership and review routing are defined in [`CODEOWNERS`](./CODEOWNERS).
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

## Branch and promotion guidance (current repo)

- `main` is the default branch.
- Use short-lived feature/fix branches and merge via pull request to `main`.
- Cut releases from tagged commits (`vX.Y.Z`) after required checks pass.
