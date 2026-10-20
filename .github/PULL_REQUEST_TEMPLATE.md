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

## Security & Hygiene Checklist

- [ ] **Zero Secret Egress (ZSE)**: Verified no hardcoded credentials, API keys, or private keys are introduced.
- [ ] **Clean Git Index**: Verified no generated or runtime artifacts are tracked (`node_modules/`, `.next/`, `dist/`, `test-results/`, `playwright-report/`).
- [ ] **Environment Hygiene**: Confirmed `.env` files remain untracked and any configuration changes update `.env.example`.
- [ ] **Workflow Integrity**: Confirmed any updated GitHub Action references use valid version tags or immutable commit SHAs.

## Pre-Commit Verification Checklist

- [ ] **System Security Audit**: Executed `python3 scripts/maintenance/system_audit.py` (Passed).
- [ ] **Dependency Consistency**: Executed `node scripts/check-dependency-consistency.mjs` (Passed).
- [ ] **Type Check**: Executed `pnpm typecheck` (Passed).
- [ ] **Test Suite**: Executed `pnpm test` (Passed).

---

## Verification Evidence & Output

Provide log outputs, test results, or manual verification evidence demonstrating that the changes have been tested and function as intended.

```text
[Paste relevant test summary or verification output here]
```
