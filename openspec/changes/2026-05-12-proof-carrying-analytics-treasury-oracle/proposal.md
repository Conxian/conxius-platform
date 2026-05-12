# Proposal: CON-331 Proof-Carrying Analytics Pilot (Treasury + Oracle)

## Problem
Treasury and oracle workflows currently consume analytics outputs that are reproducible but not cryptographically verifiable end-to-end. For policy-sensitive decisions, this creates integrity risk: consumers cannot independently prove that a result came from approved query logic at the expected Bitcoin/Stacks anchor freshness.

## Goals

1. Define the pilot workloads that require proof-carrying analytics.
2. Define a fail-closed verification path: `result + proof + commitment` verified offchain before consumption.
3. Define freshness policy anchored to Bitcoin and Stacks (`burn-block-height` aware).
4. Define concrete gateway/control-plane interfaces and an attestation envelope schema for downstream consumers.
5. Define a minimal rollout slice that can run in shadow mode before enforcement.

## Scope

### In scope

- Pilot design for four proof-worthy workload classes:
  - treasury solvency snapshots,
  - runway metrics used for policy decisions,
  - oracle-facing outputs that influence protocol behavior,
  - published balance attestations.
- Gateway/control-plane verification and attestation flow.
- Attestation schema fields and fail-closed consumer contract.
- OLTP vs analytics boundary rules for migration safety.
- Stacks-native integration constraints for pilot execution.

### Out of scope

- Replacing Gateway/Nexus as canonical protocol state authority.
- Direct onchain proof verification in Stacks contracts for this pilot.
- Broad analytics migration outside the defined pilot slice.
- Dashboard UX changes unrelated to attestation gating.

## Deliverables

- `openspec/changes/2026-05-12-proof-carrying-analytics-treasury-oracle/proposal.md`
- `openspec/changes/2026-05-12-proof-carrying-analytics-treasury-oracle/design.md`
- `openspec/changes/2026-05-12-proof-carrying-analytics-treasury-oracle/tasks.md`

