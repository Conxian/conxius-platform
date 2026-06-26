# Proposal: Harden Conxian/demo-repository for Investor-Ready Status

Refs #1064

## Problem

Live repo review of `Conxian/demo-repository` found that the repo is safe to be public because it is minimal, but it is not investor- or public-ready as a meaningful project surface.

Observed deficiencies:
- README reads like onboarding/demo placeholder text rather than a real public project
- `package.json` declares MIT license but no root `LICENSE` file exists
- Missing governance files: `.gitignore`, `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`
- No lock file present, so installs are not reproducible
- `proof-html` workflow not SHA-pinned
- Auto-assign workflow hardcodes a personal GitHub handle

## Goals

1. Make `demo-repository` investor-ready by adding all required governance files
2. Ensure reproducible builds via lock file
3. Pin GitHub Actions to commit SHAs for security
4. Remove hardcoded personal handles from workflows
5. Update repository taxonomy to include demo-repository with appropriate classification

## Scope

- Create/verify `Conxian/demo-repository` with proper governance scaffolding
- Add root governance files: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, `.gitignore`
- Add lock file (`pnpm-lock.yaml` or `package-lock.json`)
- Pin workflow actions to commit SHAs
- Remove hardcoded personal GitHub handles from auto-assign workflow
- Update `docs/REPOSITORY_TAXONOMY.md` to include demo-repository

## Deliverables

- OpenSpec proposal: `openspec/changes/2026-06-26-issue-1064-demo-repository-hardening/proposal.md`
- OpenSpec tasks: `openspec/changes/2026-06-26-issue-1064-demo-repository-hardening/tasks.md`
- Updated `docs/REPOSITORY_TAXONOMY.md` with demo-repository entry
- Governance files added to demo-repository:
  - `LICENSE` (MIT)
  - `SECURITY.md`
  - `CONTRIBUTING.md`
  - `CODEOWNERS`
  - `.gitignore`
  - Lock file

## Priority follow-up items

- Replace or rewrite the README if this repo is meant to stay public
- Decide whether the repo should remain public, be archived, or be excluded from investor-facing org signals
