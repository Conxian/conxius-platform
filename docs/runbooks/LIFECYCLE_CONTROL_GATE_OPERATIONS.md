# Lifecycle/control gate operate readiness (CON-698)

Refs: #721, CON-698

## Scope

This runbook defines release/operate expectations for lifecycle/control gates in `conxius-platform`.

Primary gate command:

```bash
pnpm run check:lifecycle-control
```

## Ownership and escalation

| Role | Owner | Responsibility |
| --- | --- | --- |
| Gate owner of record (operational) | `@conxian/core-devs` | Accountable for gate definitions, release suitability, and policy drift remediation; this role does not override repository `CODEOWNERS` merge authority. |
| Change implementer | PR author | Runs gates locally, links evidence, and resolves failures before merge. |
| Release owner | Release PR owner | Verifies lifecycle/control evidence is attached before tag/promotion. |

Root `CODEOWNERS` remains the authoritative source for repository code-review and merge ownership.

### Escalation path

1. If lifecycle/control gates fail on release-bound changes, block promotion.
2. Notify `@conxian/core-devs` (operational gate owner) and mapped `CODEOWNERS` maintainers in the release PR/issue, then attach gate summary/log artifacts.
3. If unresolved by release cutoff, create a follow-up blocking issue and defer promotion.

## Monitoring expectations

1. Monitor workflow health for `.github/workflows/lifecycle-control-gates.yml` on active release branches and `main`.
2. Treat repeated gate failures as policy drift signals requiring docs/script updates.
3. During release prep, confirm latest successful gate run is on the candidate commit SHA.
4. Include lifecycle/control gate status in release readiness checkpoints.

## Rollback plan for gate regressions

If a newly introduced gate change causes non-actionable or invalid failures:

1. Revert the offending gate change commit (`git revert <sha>`) in a scoped hotfix branch.
2. Re-run `pnpm run check:lifecycle-control` plus existing boundary guards.
3. Document rollback trigger, owner, and timestamp in release records.
4. Open a corrective follow-up issue before re-introducing gate changes.

## Release handoff requirements

Before release/tag promotion:

- [ ] Latest `check:lifecycle-control` run is passing on candidate SHA.
- [ ] Evidence links are attached per `docs/runbooks/LIFECYCLE_CONTROL_VERIFICATION_EVIDENCE.md`.
- [ ] Owner/escalation acknowledgment is recorded in PR/issue discussion.
- [ ] Rollback owner and trigger conditions are confirmed.

## Continuous improvement

When gate criteria change, update in the same PR:

- `scripts/verify_lifecycle_control_gates.py`
- `docs/runbooks/LIFECYCLE_CONTROL_VERIFICATION_EVIDENCE.md`
- `docs/runbooks/LIFECYCLE_CONTROL_GATE_OPERATIONS.md`
- `docs/runbooks/RELEASE_CHECKLIST_TEMPLATE.md`
