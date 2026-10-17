# Pull Request Description

## Overview

Provide a concise summary of the changes made in this pull request and the problem or feature it addresses.

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 🔒 Security fix / Hardening (remediating exposure or vulnerability)
- [ ] 🛠️ Maintenance / Refactoring (non-functional cleanup or technical debt reduction)
- [ ] 📄 Governance / Documentation (policy, README, or architecture update)
- [ ] 🧪 Test suite / Verification enhancement

## Context & Issue / OpenSpec Linkage

- **Linear Issue / GitHub Issue**: Fixes # / Relates to `CON-XXXX`
- **OpenSpec Proposal**: `openspec/changes/XXXX` (or N/A for non-spec maintenance)

---

### Feature -> dev promotion checklist
<!-- PROMOTION:FEATURE->DEV -->
- [x] Feature implementation verified via automated test suite.
- [x] No sensitive environment files or credentials tracked.
- [x] Pre-flight security and hygiene audit executed successfully.

---

## Security & Hygiene Checklist

- [x] **Zero Secret Egress (ZSE)**: Verified no hardcoded credentials, API keys, or private keys are introduced.
- [x] **Clean Git Index**: Verified no generated or runtime artifacts are tracked (`node_modules/`, `.next/`, `dist/`, `test-results/`, `playwright-report/`).
- [x] **Environment Hygiene**: Confirmed `.env` files remain untracked and any configuration changes update `.env.example`.
- [x] **Workflow Integrity**: Confirmed any updated GitHub Action references use valid version tags or immutable commit SHAs.

## Pre-Commit Verification Checklist

- [x] **System Security Audit**: Executed `python3 scripts/maintenance/system_audit.py` (Passed).
- [x] **Dependency Consistency**: Executed `node scripts/check-dependency-consistency.mjs` (Passed).
- [x] **Type Check**: Executed `pnpm typecheck` (Passed).
- [x] **Test Suite**: Executed `pnpm test` (Passed).

---

## Verification Evidence & Output

Provide log outputs, test results, or manual verification evidence demonstrating that the changes have been tested and function as intended.

```text
[Passed 348 Vitest unit tests + Python test suite + system audit]
```
