# Spec Delta: Metric Specs v1 (Ownership + Data Contracts)

This change introduces a new normative specification document:

- `openspec/specs/metric-specs-v1.spec.md`

## Added requirements

1. The platform MUST define canonical v1 semantics for metrics `C_R`, `O_C`, `V_X`, `A_S`, and `N_E`.
2. Each metric definition MUST include: definition, formula, owner function, data source/query, refresh cadence, and required data contracts/dependencies.
3. Owner assignments in v1 MUST remain function-level; named DRIs SHOULD be assigned in a follow-up governance change.
4. `C_R`, `O_C`, `V_X`, `A_S`, and `N_E` formulas MUST match approved v1 semantics exactly.
5. Data contract dependencies and gating thresholds for `A_S` and `N_E` MUST be explicitly captured as normative requirements.
6. Canonical metric semantics MUST include provenance links to issue #692 and approved comment context.
