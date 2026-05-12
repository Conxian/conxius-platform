# Tasks: Issue #637 Multi-Token UX Rationalization

## Baseline deliverables
- [ ] Publish canonical user-facing token model and terminology contract.
- [ ] Publish updated UX flow definitions and product-copy requirements for onboarding, transacting, and balance interpretation.
- [ ] Publish migration compatibility notes for existing wallets/accounts.
- [ ] Publish success metrics and instrumentation requirements for UX outcome measurement.

## Acceptance criteria (testable)
- [ ] **AC-1 (canonical model):** approved token model defines role/intent and user-safe abstraction for each token interaction.
  - **Pass when:** model includes normative role definitions and presentation rules.
  - **Fail when:** token roles remain overlapping, ambiguous, or implementation-specific.
- [ ] **AC-2 (flow + copy alignment):** UX flows and copy are updated to match the canonical token model.
  - **Pass when:** onboarding, transacting, and balance interpretation flows explicitly reference the canonical model.
  - **Fail when:** any core flow still uses contradictory semantics.
- [ ] **AC-3 (migration compatibility):** migration notes cover backward compatibility, edge cases, and existing account impact.
  - **Pass when:** notes include fallback behavior and operator/user-visible impact.
  - **Fail when:** migration behavior is undocumented or only covers ideal path.
- [ ] **AC-4 (measurable outcomes):** success metrics and instrumentation are defined for comprehension and error reduction.
  - **Pass when:** each metric has a defined source signal and review cadence.
  - **Fail when:** goals are qualitative only and cannot be measured.

## Open review checklist
- [ ] Confirm canonical token terminology with product, design, and compliance stakeholders.
- [ ] Confirm required localization/language adaptations for Global South markets.
- [ ] Confirm whether legacy clients receive compatibility mode or forced upgrade path.
- [ ] Confirm metric baselines and target deltas for launch readiness.
- [ ] Confirm support playbook updates for expected migration-related questions.
