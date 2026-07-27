# Spec Delta: Protocol Revenue Observation and Founder-Rights Evidence

This change adds the canonical observation contract at
[`openspec/specs/protocol-revenue-observation-v1.spec.md`](../../specs/protocol-revenue-observation-v1.spec.md)
and the change-local `spec-driven` delta at
[`specs/protocol-revenue-observation/spec.md`](specs/protocol-revenue-observation/spec.md).

The delta is intentionally limited to platform observation and fail-closed
validation. It does not ratify founder rights, replace protocol governance, or
change Clarity/economic policy.

| Requirement | Implementation |
| --- | --- |
| Authority and provenance | JSON Schema plus pure TypeScript validator |
| Explicit units and integer bps | `schemas/protocol-revenue-observation.schema.json` |
| Deployment/evidence stages | Schema, validator, and focused tests |
| Protocol-owned routing and no custody | Schema constants and semantic checks |
| Exact schedules and payout gate | Validator and regression tests |
