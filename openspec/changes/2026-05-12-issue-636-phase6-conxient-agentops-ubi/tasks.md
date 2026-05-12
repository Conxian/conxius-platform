# Tasks: Issue #636 Phase 6 Conxient AgentOps + UBI

## Baseline deliverables
- [ ] Publish a single Phase 6 architecture/spec artifact covering AgentOps boundaries, contracts, and controls.
- [ ] Publish API parity matrix for AI allocation, UBI identity, and nexus sync interfaces.
- [ ] Publish prototype validation findings against real integration paths.
- [ ] Publish rollout guardrails for feature flags, staged rollout, observability, and rollback.

## Acceptance criteria (testable)
- [ ] **AC-1 (single architecture artifact):** one normative document defines boundaries, responsibilities, and operational controls for Phase 6.
  - **Pass when:** document includes AgentOps ownership, service boundaries, and mandatory controls.
  - **Fail when:** architecture details are split across ad-hoc docs or omit key boundaries.
- [ ] **AC-2 (API parity validation):** parity requirements are specified and validated for AI allocation, UBI identity, and nexus sync.
  - **Pass when:** matrix includes request/response compatibility, version notes, and mismatch handling.
  - **Fail when:** parity claims are undocumented or lack compatibility details.
- [ ] **AC-3 (prototype readiness evidence):** prototype findings capture what works, gaps, risks, and readiness criteria.
  - **Pass when:** findings are evidence-backed and tied to real integration flows.
  - **Fail when:** findings are anecdotal or omit readiness gates.
- [ ] **AC-4 (rollout safety):** rollout plan defines feature-flag controls, staged activation, observability, and rollback.
  - **Pass when:** each control has measurable triggers and clear ownership.
  - **Fail when:** rollout is defined as direct cutover without safeguards.

## Open review checklist
- [ ] Confirm owner/team for AgentOps control-plane operations.
- [ ] Confirm minimum API version support window for downstream clients.
- [ ] Confirm production-readiness thresholds for reliability and model quality.
- [ ] Confirm mandatory dashboards/alerts before feature-flag enablement.
- [ ] Confirm rollback blast-radius and communication protocol.
