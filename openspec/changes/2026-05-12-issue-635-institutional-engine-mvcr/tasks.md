# Tasks: Issue #635 Institutional Engine ERP + MVCR

## Baseline deliverables
- [ ] Publish ERP sync contract spec with canonical entities, directionality, idempotency, retries, and error semantics.
- [ ] Publish ISO 20022 bridge mapping documentation for required payment/status/reporting flows.
- [ ] Publish MVCR artifact specification for machine-readable and human-readable outputs with traceability requirements.
- [ ] Add integration test plan and executable coverage for success and failure scenarios.

## Acceptance criteria (testable)
- [ ] **AC-1 (ERP contract completeness):** ERP sync contract defines canonical entities, directionality, idempotency/retry behavior, and error taxonomy.
  - **Pass when:** contract includes all required sections with normative constraints.
  - **Fail when:** any required section is missing or ambiguous.
- [ ] **AC-2 (ISO 20022 mapping coverage):** required institutional message flows have explicit source/target mapping notes.
  - **Pass when:** each required flow documents field mapping and unsupported-field handling.
  - **Fail when:** any required flow lacks explicit mapping behavior.
- [ ] **AC-3 (MVCR output determinism):** MVCR artifacts are generated in both machine-readable and human-readable forms tied to gateway/compliance events.
  - **Pass when:** artifact schema + rendering contract include stable IDs and provenance metadata.
  - **Fail when:** outputs are non-traceable, single-format only, or optional.
- [ ] **AC-4 (E2E validation):** integration tests cover ERP sync + ISO 20022 mapping + MVCR generation across success/failure.
  - **Pass when:** test matrix executes all three domains and asserts expected outcomes.
  - **Fail when:** tests omit a domain or only validate happy path behavior.

## Open review checklist
- [ ] Confirm canonical ERP systems/versions in-scope for first release.
- [ ] Confirm required ISO 20022 message variants by corridor and banking partner.
- [ ] Confirm MVCR retention and signing requirements with compliance/audit owners.
- [ ] Confirm SLA and retry windows for ERP/Gateway synchronization.
- [ ] Confirm ownership boundary for contract/version changes across platform vs enterprise integration teams.
