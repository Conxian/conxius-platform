# Tasks: CON-331 Proof-Carrying Analytics Pilot (Treasury + Oracle)

## Deliverable checklist

- [x] Create `proposal.md` with problem, goals, scope, out-of-scope, and deliverables.
- [x] Create `design.md` covering proof-worthy workloads, verification path, architecture, migration boundary, and Stacks constraints.
- [x] Define concrete gateway/control-plane interfaces and attestation envelope schema.
- [x] Capture pilot rollout slices and fail-closed consumer behavior.

## Acceptance criteria tracking (CON-331 / GitHub #317)

### Direct issue acceptance criteria

- [x] **Issue AC-1 (proof-worthy workload coverage):** Design SHALL explicitly enumerate the four pilot workload classes: treasury solvency, runway policy metric, oracle-facing outputs, and published balance attestations.
  - **Pass when:** all four classes appear in `design.md` section "Proof-worthy pilot workloads".
  - **Fail when:** any class is missing or treated as optional.

- [x] **Issue AC-2 (verification path completeness):** Design SHALL define `result + proof + commitment` verification, offchain verifier behavior, freshness checks including burn block height, signed envelope output, and fail-closed consumers.
  - **Pass when:** each required stage is present as a normative step in `design.md` section "Verification path (fail-closed)".
  - **Fail when:** any required stage is absent or allows fail-open behavior.

- [x] **Issue AC-3 (pilot architecture + rollout):** Design SHALL define the pilot architecture pipeline and a staged rollout slice (shadow -> enforced treasury path -> oracle path).
  - **Pass when:** architecture diagram and rollout slices are documented with transition criteria.
  - **Fail when:** rollout sequencing or transition criteria are unspecified.

- [x] **Issue AC-4 (OLTP vs analytics boundary):** Design SHALL state that canonical state mutation remains in Gateway/Nexus and analytics outputs cannot directly mutate protocol state.
  - **Pass when:** boundary and bridge rules are explicit and fail-closed.
  - **Fail when:** direct state mutation from analytics is allowed.

### Derived OpenSpec completion criteria (not direct issue bullets)

- [x] **OpenSpec AC-5 (derived, not a direct issue bullet):** Design SHALL define Bitcoin/Stacks anchor requirements and burn block height-aware freshness constraints for pilot consumption.
  - **Pass when:** constraints are listed and tied to attestation validation.
  - **Fail when:** Stacks anchor context or burn block lag checks are missing.

- [x] **OpenSpec AC-6 (derived, not a direct issue bullet):** Design SHALL provide concrete request/response shapes for gateway/control-plane interactions and a concrete attestation envelope schema with required fields.
  - **Pass when:** endpoint contracts and schema fields are documented in JSON form.
  - **Fail when:** interfaces are described only abstractly without field definitions.

