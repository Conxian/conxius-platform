# OpenSpec Proposal: Institutional Engine ERP Integration + MVCR Reporting

Refs #635

## Problem statement
Institutional adoption requires legacy ERP interoperability and audit-grade compliance evidence, but the current platform does not yet define a stable ERP sync contract, complete ISO 20022 bridge coverage, or deterministic MVCR artifact outputs.

## Proposed scope

### 1) ERP sync contract (legacy-first)
Define a canonical ERP integration contract covering:
- canonical entities (`CustomerAccount`, `Invoice`, `PaymentInstruction`, `SettlementStatus`, `ComplianceCase`)
- directionality (ERP -> Gateway command flow; Gateway -> ERP status/event flow)
- retry + idempotency rules (`idempotency_key`, replay window, duplicate handling)
- error semantics (validation, upstream timeout, mapping mismatch, policy rejection)

### 2) ISO 20022 bridge coverage
Specify required institutional flows and field mappings for:
- payment initiation (`pacs.008`-aligned)
- payment status (`pacs.002`-aligned)
- account/reporting updates (`camt`-aligned where applicable)

Include explicit mapping notes for required source/target fields and unsupported-field behavior.

### 3) MVCR artifact generation
Define gateway outputs that produce both:
- machine-readable artifacts (versioned JSON payload)
- human-readable artifacts (rendered report for audit/compliance review)

Artifacts MUST be tied to gateway/compliance event IDs and include generation provenance.

### 4) End-to-end integration validation
Define integration scenarios spanning success + failure paths across:
- ERP ingest/sync
- ISO 20022 mapping + translation
- MVCR artifact generation + retrieval

## Acceptance criteria mapping
| Issue acceptance criterion | Proposal commitment |
| --- | --- |
| ERP sync contract approval | Canonical entity model, directionality matrix, idempotency/retry policy, error taxonomy |
| ISO 20022 bridge coverage | Required message flow coverage and explicit field-level mapping notes |
| MVCR artifact outputs | Normative machine-readable + human-readable artifact requirements with traceability |
| End-to-end tests | Scenario matrix for success/failure, including deterministic pass/fail assertions |

## Dependencies and sequencing
- No hard blocker to start specification work.
- Interfaces from this change are expected to stabilize before downstream #636 and #637 finalization.
