# Conxius Platform: Gap-to-Research Scoring Matrix (Phase 7)

This matrix scores the identified gaps based on Strategic Alignment, Implementation Complexity, and Customer Validation Signal.

| ID | Gap Description | Strategic Alignment | Complexity | Validation Signal | **Total Score** | Primary Research Link |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **G-01** | **BitVM2 Verification Floor** | 10 | 9 | 7 | **26** | [BitVM2 Floor](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#21) |
| **G-02** | **FDC3 Native Resolver Bridge** | 9 | 6 | 8 | **23** | [FDC3 Interop](./architecture/FDC3_INTEROPERABILITY.md) |
| **G-03** | **Usage Validation Instrumentation** | 8 | 4 | 10 | **22** | [Usage Spec](../openspec/specs/usage-validation-instrumentation-v1.spec.md) |
| **G-04** | **Wasm-First Wallet-BFF** | 9 | 7 | 6 | **22** | [USI Integration](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#15) |
| **G-05** | **Micro-Frontend Federation** | 7 | 8 | 5 | **20** | [Sovereign Redesign](./architecture/SOVEREIGN_REPR_2026.md#3) |
| **G-06** | **DLC Native Finance** | 9 | 8 | 6 | **23** | [DLC Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#26) |
| **G-07** | **Nostr Wallet Connect (NWC)** | 8 | 5 | 9 | **22** | [NWC Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#27) |
| **G-08** | **ZK-Rollup T1 Adapters** | 9 | 7 | 7 | **23** | [ZK-Rollup Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#28) |
| **G-09** | **BIP-322 Signed Intents** | 10 | 6 | 8 | **24** | [BIP-322 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#29) |
| **G-10** | **MuSig2 Aggregation** | 9 | 6 | 7 | **22** | [MuSig2 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#31) |
| **G-11** | **Silent Payments (BIP-352)** | 8 | 7 | 6 | **21** | [Silent Payments Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#30) |
| **G-12** | **BIP-353 DNS Payments** | 7 | 5 | 8 | **20** | [BIP-353 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#32) |
| **G-13** | **Layer 3 DeFi Rollups** | 6 | 8 | 5 | **19** | [L3 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#33) |
| **G-14** | **FROST Threshold Signatures** | 9 | 8 | 7 | **24** | [FROST Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#34) |
| **G-15** | **OP_CAT Recursive Covenants** | 10 | 7 | 6 | **23** | [OP_CAT Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#35) |
| **G-16** | **Fedimint Community Liquidity** | 8 | 7 | 8 | **23** | [Fedimint Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#36) |

## Scoring Rubric (1-10)
- **Strategic Alignment**: How critical is this to the "Full Bitcoin Stack" vision?
- **Complexity**: How much engineering effort is required? (Lower = Better for "Best Candidate")
- **Validation Signal**: How much immediate feedback/validation does this provide?

## Decision Matrix
1. **Strategic Priority**: G-01 (BitVM2) - Highest score, foundational for trustless sBTC.
2. **Readiness Priority**: G-03 (Usage Validation) - Low complexity, high signal.
3. **Institutional Priority**: G-02 (FDC3) - Medium complexity, high alignment.
4. **Strategic Anchor**: G-09 (BIP-322) - Essential for USI Intent signatures.

## Refined Best Candidate Implementation Plan (v1.9.2)
1. **Strategic Anchor**: **G-09 (BIP-322)** - High alignment, medium complexity. Provides the signature foundation for all other USI intents.
2. **Operational Bridge**: **G-07 (NWC)** - Low complexity, high signal. Immediate non-custodial authorization value.
3. **Institutional Anchor**: **G-01 (BitVM2)** - Highest strategic score. Essential for sBTC trust-minimization.
| **G-17** | **Simplicity Verification** | 8 | 9 | 5 | **22** | [Simplicity Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#37) |
| **G-18** | **BIP-324 Transport** | 7 | 6 | 7 | **20** | [BIP-324 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#38) |
| **G-19** | **Spider Network Routing** | 6 | 8 | 5 | **19** | [Spider Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#39) |
| **G-20** | **BitVM3 Adaptive Proofs** | 10 | 9 | 6 | **25** | [BitVM3 Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#40) |

## Updated Phase 7 Research Conclusion (v1.9.3)
- **G-20 (BitVM3)** is now the second highest strategic priority after G-01.
- **G-01 (BitVM2)** remains the immediate foundational requirement for sBTC.
- **G-09 (BIP-322)** is the implementation anchor for USI Intent verification.
| **G-21** | **Sangria/Nova Proof Folding** | 9 | 9 | 6 | **24** | [Proof Folding](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#24) |
| **G-22** | **ctUSD Stablecoin Logic** | 8 | 7 | 9 | **24** | [DLC Stablecoin](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#26) |
| **G-23** | **Ark V-UTXO Protocol** | 8 | 8 | 7 | **23** | [Ark Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#25) |

## Final Candidate Selection (v1.9.4)
1. **G-01 (BitVM2)** - **26 Points**. Highest Strategic Alignment. Foundation for sBTC trust-minimization.
2. **G-20 (BitVM3)** - **25 Points**. Future-proof adaptation for G-01.
3. **G-21/G-22** - **24 Points**. High signal and alignment.
| **G-41** | **Taproot Assets** | 8 | 6 | 8 | **22** | [Taproot Assets Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#41) |
| **G-42** | **PTLCs** | 9 | 7 | 6 | **22** | [PTLC Research](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#42) |
