# Spec Delta: CON-698 lifecycle/control gates for `conxius-platform` (Issue #721)

This change adds repository-level lifecycle/control requirements and machine-enforced policy checks.

## Added requirements

1. `conxius-platform` MUST publish a design-impact review aligned to the canonical CON-685 lifecycle/control operating model, including explicit decisions, outcomes, and rationale.
2. Lifecycle/control checks MUST be machine-enforced via repository scripts and MUST run in CI on pull requests and pushes to protected branches.
3. Lifecycle/control verification runs MUST emit reproducible artifacts to `test-results/lifecycle-control-gates/`.
4. Verification evidence handling MUST define where artifacts live, how to refresh them, and what links to include in PR/issue records.
5. Release/operate readiness documentation MUST include:
   - gate owner-of-record,
   - escalation routing,
   - rollback actions for failing/invalid gates,
   - monitoring expectations for ongoing gate health.
6. Release checklist and release policy documentation MUST reference lifecycle/control gates as required controls before promotion.
