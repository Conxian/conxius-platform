# Conxius Platform: Gap-to-Research Scoring Matrix (Phase 7)

This matrix scores the identified gaps based on Strategic Alignment, Implementation Complexity, and Customer Validation Signal. Scores are prioritization signals, not production-readiness evidence. For BitVM/ZKCP, issue #1187 records the current platform state: fail-closed contracts and quarantine are implemented, while cryptographic backends and independent acceptance remain pending.

| ID | Gap Description | Strategic Alignment | Complexity | Validation Signal | **Total Score** | Primary Research Link |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **G-01** | **BitVM2 Verification Floor** | 10 | 9 | 7 | **26** | [BitVM2 Floor](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#21) — platform boundary fail-closed; backend pending |
| **G-02** | **FDC3 Native Resolver Bridge** | 9 | 6 | 8 | **23** | [FDC3 Interop](./architecture/FDC3_INTEROPERABILITY.md) |
| **G-03** | **Usage Validation Instrumentation** | 8 | 4 | 10 | **22** | [Usage Spec](../openspec/specs/usage-validation-instrumentation-v1.spec.md) |
| **G-04** | **Wasm-First Wallet-BFF** | 9 | 7 | 6 | **22** | [USI Integration](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#15) |
| **G-05** | **Silent Payments (BIP-352)** | 8 | 7 | 6 | **21** | [Silent Payments Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#30) |
| **G-06** | **DLC Native Finance** | 9 | 8 | 6 | **23** | [DLC Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#26) |
| **G-07** | **Nostr Wallet Connect (NWC)** | 8 | 5 | 9 | **22** | [NWC Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#27) |
| **G-08** | **ZK-Rollup T1 Adapters** | 9 | 7 | 7 | **23** | [ZK-Rollup Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#28) |
| **G-09** | **BIP-322 Signed Intents** | 10 | 6 | 8 | **24** | [BIP-322 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#29) |
| **G-10** | **MuSig2 Aggregation** | 9 | 6 | 7 | **22** | [MuSig2 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#31) |
| **G-11** | **BitVM2 Multi-Party Aggregation** | 10 | 8 | 8 | **26** | [BitVM2 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#31) — aggregation gated behind verified backend evidence |
| **G-12** | **ERC-7683 Solver Selection** | 8 | 7 | 8 | **23** | [L3 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#33) |
| **G-13** | **Micro-Frontend Federation** | 7 | 8 | 5 | **20** | [Sovereign Redesign](./architecture/SOVEREIGN_REPR_2026.md#3) |
| **G-14** | **FROST Threshold Signatures** | 9 | 8 | 7 | **24** | [FROST Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#34) |
| **G-15** | **OP_CAT Recursive Covenants** | 10 | 7 | 6 | **23** | [OP_CAT Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#35) |
| **G-16** | **Fedimint Community Liquidity** | 8 | 7 | 8 | **23** | [Fedimint Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#36) |
| **G-17** | **BIP-353 DNS Payments** | 7 | 5 | 8 | **20** | [BIP-353 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#32) |
| **G-18** | **BIP-324 Transport** | 7 | 6 | 7 | **20** | [BIP-324 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#38) |
| **G-19** | **Spider Network Routing** | 6 | 8 | 5 | **19** | [Spider Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#39) |
| **G-20** | **BitVM3 Adaptive Proofs** | 10 | 9 | 6 | **25** | [BitVM3 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#40) — recursive backend pending |
| **G-21** | **Sangria/Nova Proof Folding** | 9 | 9 | 6 | **24** | [Proof Folding](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#24) |
| **G-22** | **ctUSD Stablecoin Logic** | 8 | 7 | 9 | **24** | [DLC Stablecoin](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#26) |
| **G-23** | **Ark V-UTXO Protocol** | 8 | 8 | 7 | **23** | [Ark Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#25) |
| **G-41** | **Taproot Assets** | 8 | 6 | 8 | **22** | [Taproot Assets Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#41) |
| **G-42** | **PTLCs** | 9 | 7 | 6 | **22** | [PTLC Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#42) |
| **G-43** | **Babylon Bitcoin Staking** | 9 | 8 | 7 | **24** | [Babylon Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#43) |
| **G-44** | **BitVMX Computation** | 10 | 9 | 6 | **25** | [BitVMX Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#44) |
| **G-45** | **BOLT-12 Offers** | 8 | 7 | 8 | **23** | [BOLT-12 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#45) |
| **G-46** | **RGB++ Protocol** | 7 | 8 | 6 | **21** | [RGB++ Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#46) |
| **G-47** | **BIP-119 (CTV) Vaults** | 9 | 7 | 6 | **22** | [BIP-119 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#47) |
| **G-48** | **BIP-324 V2 Transport** | 8 | 6 | 7 | **21** | [BIP-324 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#48) |
| **G-49** | **Decentralized USI Transport** | 9 | 5 | 9 | **23** | [Nostr/Waku Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#49) |
| **G-50** | **ZK Contingent Payments** | 10 | 9 | 7 | **26** | [ZKCP Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#50) — verifier/observer/key-release backends pending |
| **G-51** | **BitVM2 Optimized Verifier** | 9 | 8 | 7 | **24** | [Verifier Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#51) — research only; no pairing implementation here |
| **G-52** | **BRC-20 / Runes Integration** | 7 | 6 | 9 | **22** | [Indexer Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#52) |
| **G-53** | **Lightning Async Payments** | 8 | 7 | 9 | **24** | [Async Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#53) |
| **G-54** | **OP_VAULT (BIP-345)** | 9 | 8 | 6 | **23** | [Vault Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#54) |
| **G-55** | **Enterprise ERP Simulation** | 9 | 7 | 8 | **24** | [Enterprise ERP Simulation](./architecture/ENTERPRISE_ERP_SIMULATION_RESEARCH.md) |
| **G-56** | **Founder-rights observation/evidence boundary** | 10 | 4 | 10 | **24** | [Founder-rights observation](./architecture/proposals/FOUNDER_RIGHTS_REVENUE_OBSERVATION_2026-07-22.md) |
| **G-57** | **Cross-repository revenue model drift** | 10 | 6 | 9 | **25** | [Contradictions and ownership](./architecture/proposals/FOUNDER_RIGHTS_REVENUE_OBSERVATION_2026-07-22.md#contradictions-and-safe-interpretation) |
| **G-58** | **Deployment evidence/live-interface verification** | 10 | 5 | 9 | **24** | [Evidence matrix](./architecture/proposals/FOUNDER_RIGHTS_REVENUE_OBSERVATION_2026-07-22.md#verified-evidence-matrix) |
| **G-59** | **Gateway/Nexus observation integration** | 9 | 7 | 8 | **24** | [Phase plan](./architecture/proposals/FOUNDER_RIGHTS_REVENUE_OBSERVATION_2026-07-22.md#phase-plan) |

## Scoring Rubric (1-10)
- **Strategic Alignment**: How critical is this to the "Full Bitcoin Stack" vision?
- **Complexity**: Effort required to implementation (10 = Hyper-complex).
- **Validation Signal**: Current demand/interest from corporate treasury or developers.

## Final Candidate Selection (v1.9.4)
1. **G-01 (BitVM2) / G-11 (Aggregation)** - **26 Points**. Highest Strategic Alignment. Foundation for sBTC trust-minimized settlement.
2. **G-50 (ZKCP)** - **26 Points**. Zero-trust exchange of information for value.
3. **G-20 (BitVM3) / G-44 (BitVMX)** - **25 Points**. Future-proof adaptation for the verification floor.

The #1187 remediation does not change these strategic scores. It changes the
readiness interpretation: a score or a research result cannot authorize
settlement, and the profile-specific BitVM2 tap count described in research is
not a universal constant or proof of verification.

---
*Updated by Jules (Sovereign Engineering Agent) - June 2026*

## Phase 4 Candidate Update (2026-07-22)

The selected #1168 candidate is the founder-rights revenue observation and
evidence contract. Its score is a prioritization signal, not protocol
approval. This platform work implements the observation schema, pure
fail-closed validator, tests, and evidence report; it does not select a fee,
allocation, beneficiary, custody model, payout route, or deployment state.

- **G-56** is implemented as the observation boundary; ratification remains a
  protocol governance question.
- **G-57** and **G-58** remain active cross-repository ownership and deployment
  evidence gaps.
- **G-59** remains a future read-only Gateway/Nexus integration, requiring a
  separate OpenSpec change.
