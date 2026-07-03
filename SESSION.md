# Session Operating Model

Standing governance control for Conxian-Labs work. Live enforcement anchor: [Issue #932](https://github.com/Conxian/conxius-platform/issues/932).

## Session Standard

Every meaningful session MUST satisfy the following enforcement baseline.

### 1. Grounding

The session SHALL be grounded in canonical records before any work begins.

- Review the current issue, its acceptance criteria, and linked references.
- Confirm the repository state (branch, last commit, open PRs) matches expectations.
- Identify any stale assumptions from prior sessions and resolve them explicitly.
- Do not rely on reconstructed chat memory as the primary context source.

### 2. Verification

Every output SHALL be verified against documented requirements.

- Confirm that completed work addresses the issue scope.
- Validate that changes do not introduce regressions in controls posture.
- Cross-check public-facing changes against the current public narrative.

### 3. Classification

All work SHALL carry an explicit classification before the session closes.

| Classification | Meaning |
|---|---|
| `controls-posture` | Changes that affect security, compliance, or governance posture |
| `release-posture` | Changes that affect release readiness or deployment state |
| `public-narrative` | Changes that affect public documentation, README, or communication |
| `repo-structure` | Changes that affect repository organization or classification |
| `feature` | New or modified functionality |
| `fix` | Defect resolution |
| `chore` | Maintenance, dependency, or infrastructure work |

### 4. Canonical Updates

Whenever a session changes repo classification, controls posture, release posture, or public narrative, the session SHALL synchronize:

- **Issues**: Open or update GitHub issues to reflect the new state.
- **Documents**: Update the affected canonical documents (SESSION.md, README, governance docs, etc.).
- **Linear**: Ensure the linked Linear issue (if any) reflects the current status.

## Session Operating Checklist

### Start of Session

- [ ] Review the target issue and confirm scope is understood.
- [ ] Check repository state: current branch, latest commit, open PRs.
- [ ] Identify and resolve any stale assumptions from prior sessions.
- [ ] Confirm grounding against canonical records (issues, docs, Linear).
- [ ] Assign an explicit classification to the expected work.

### End of Session

- [ ] Verify all outputs against the issue scope.
- [ ] Assign final classification to completed work.
- [ ] Synchronize issues and documents if classification, controls posture, release posture, or public narrative changed.
- [ ] Push all commits and update PRs.
- [ ] Record session summary in the issue comment thread.
- [ ] Confirm no uncommitted changes remain (or document why they are held back).

## 14-Day Workflow Review

Every 14 days, perform a retrospective review of the session operating model:

1. **Audit sessions**: Review sessions completed since the last review.
2. **Check enforcement**: Verify each session followed the checklist and classification requirements.
3. **Update canonical records**: Apply any corrections to issues, documents, or Linear state.
4. **Refine the standard**: Propose improvements to this document based on observed gaps or friction.
5. **File findings**: Open or update an issue documenting the review outcome.

The review is itself a session subject to this standard.

## Anti-Drift

This document is the enforcement baseline. Treat it as a live control, not a one-time artifact:

- Reference it at the start and end of every session.
- Update it when the operating model evolves.
- Use [Issue #932](https://github.com/Conxian/conxius-platform/issues/932) as the change-tracking anchor for amendments.
