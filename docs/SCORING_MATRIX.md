# Conxius Platform: Gap-to-Research Scoring Matrix (Phase 7)

This matrix scores the identified gaps based on Strategic Alignment, Implementation Complexity, and Customer Validation Signal.

| ID | Gap Description | Strategic Alignment | Complexity | Validation Signal | **Total Score** | Primary Research Link |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **G-01** | **BitVM2 Verification Floor** | 10 | 9 | 7 | **26** | [BitVM2 Floor](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#21) |
| **G-02** | **FDC3 Native Resolver Bridge** | 9 | 6 | 8 | **23** | [FDC3 Interop](./architecture/FDC3_INTEROPERABILITY.md) |
| **G-03** | **Usage Validation Instrumentation** | 8 | 4 | 10 | **22** | [Usage Spec](../openspec/specs/usage-validation-instrumentation-v1.spec.md) |
| **G-04** | **Wasm-First Wallet-BFF** | 9 | 7 | 6 | **22** | [USI Integration](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#15) |
| **G-05** | **Micro-Frontend Federation** | 7 | 8 | 5 | **20** | [Sovereign Redesign](./architecture/SOVEREIGN_REPR_2026.md#3) |

## Scoring Rubric (1-10)
- **Strategic Alignment**: How critical is this to the "Full Bitcoin Stack" vision?
- **Complexity**: How much engineering effort is required? (Lower = Better for "Best Candidate")
- **Validation Signal**: How much immediate feedback/validation does this provide?

## Decision Matrix
1. **Strategic Priority**: G-01 (BitVM2)
2. **Readiness Priority**: G-03 (Usage Validation) - Low complexity, high signal.
3. **Institutional Priority**: G-02 (FDC3) - Medium complexity, high alignment.

**Best Candidate Implementation Plan**:
Initialize **G-03** (Foundational Telemetry) and **G-02** (FDC3 Resolver) as the initial "live" alignment bridge for Phase 7.
