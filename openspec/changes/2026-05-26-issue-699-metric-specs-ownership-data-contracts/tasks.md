# Tasks: Issue #699 Metric Specs v1 (Ownership + Data Contracts)

## Implementation checklist

- [x] Create dated OpenSpec change folder for issue #699.
- [x] Add `proposal.md` capturing problem, goals, scope, and provenance.
- [x] Add `spec-delta.md` describing normative additions.
- [x] Add canonical spec `openspec/specs/metric-specs-v1.spec.md` covering `C_R`, `O_C`, `V_X`, `A_S`, and `N_E`.
- [x] Encode definition, formula, owner function, source/query, cadence, and required data contracts for each metric.
- [x] Keep ownership at function-level for v1 and document that named DRIs are follow-up.

## Acceptance criteria (testable)

- [x] **AC-1 (metric completeness):** canonical spec defines all five metrics (`C_R`, `O_C`, `V_X`, `A_S`, `N_E`) with all required fields.
  - **Pass when:** each metric section includes definition, formula, owner function, source/query, cadence, and required contracts/dependencies.
  - **Fail when:** any metric or required field is missing.

- [x] **AC-2 (formula fidelity):** formulas are encoded exactly per approved v1 semantics.
  - **Pass when:** canonical spec text matches approved formulas and variable relationships.
  - **Fail when:** coefficients, operators, windows, or variable meanings differ.

- [x] **AC-3 (ownership policy):** v1 ownership remains function-level.
  - **Pass when:** each metric names a function owner and spec states named DRIs are follow-up.
  - **Fail when:** ownership is left unspecified or silently reassigned to individuals.

- [x] **AC-4 (provenance):** canonical semantics include source approvals.
  - **Pass when:** issue #692 and the approved comment permalink are referenced in OpenSpec artifacts.
  - **Fail when:** provenance links are absent.

## Follow-up (out of scope for this change)

- [ ] Assign named DRIs for each function owner and record operational accountability owners in governance/runbook artifacts.
