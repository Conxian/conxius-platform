# Tasks: Harden Conxian/demo-repository

Refs #1064

## Implementation Tasks

- [ ] 1. Add `demo-repository` to `docs/REPOSITORY_TAXONOMY.md` with appropriate classification
- [ ] 2. Add governance files to `demo-repository`:
  - [ ] Add `LICENSE` (MIT)
  - [ ] Add `SECURITY.md`
  - [ ] Add `CONTRIBUTING.md`
  - [ ] Add `CODEOWNERS`
  - [ ] Add `.gitignore`
  - [ ] Add lock file (`pnpm-lock.yaml`)
- [ ] 3. Pin GitHub Actions to commit SHAs in workflow files
- [ ] 4. Remove hardcoded personal GitHub handles from auto-assign workflow

## Verification Tasks

- [ ] Verify all governance files are present
- [ ] Verify lock file is present
- [ ] Verify workflow actions are SHA-pinned
- [ ] Verify no personal handles remain in workflows

## Notes

- demo-repository is currently a scaffold/demo repo
- Priority decision: Should it remain public, be archived, or excluded from investor-facing org signals?
