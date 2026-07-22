# G-44: BitVMX Computation Research

## Overview
BitVMX is an evolution of the BitVM architecture designed for general-purpose computation on Bitcoin with significantly improved efficiency and reduced on-chain footprint compared to BitVM2. It focuses on "Adaptive Proofs" and optimized SNARK verification.

## Strategic Value
- **High-Efficiency Computation**: Enables complex off-chain logic to be verified on Bitcoin with minimal on-chain data.
- **Adaptive Proofs**: Allows for more flexible fraud proofs that adapt to the specific execution path being challenged.
- **Nexus Integration**: BitVMX is the target execution environment for the Nexus Glass Node's "Verification Floor."

## Technical Requirements
- **Wasm Runtime**: Integration with `lib-conxian-core` to execute and prove Wasm-based logic.
- **Adaptive Challenge Protocol**: Implementation of the binary search challenge-response protocol specifically for BitVMX instruction sets.
- **SNARK Verifier**: Optimized verifiers for common proof systems (Groth16, PlonK) within the BitVMX script constraints.

## BFF Integration Path
1. **Adaptive Proof Manager**: BFF-level state machine to coordinate the binary search challenge rounds.
2. **Instruction Trace Logger**: Backend storage for execution traces used to generate proofs/challenges.
3. **Multi-Party Coordination**: Extension of the G-11 Multi-Party Aggregator to support BitVMX specific signatures.

## Alignment
- **Status**: 🏗️ Research Phase.

## Platform readiness boundary (2026-07-22)

The BitVMX material is strategic research and scaffolding, not an enabled
verification backend. The admin-dashboard boundary accepts only explicit,
typed backend evidence and returns unavailable/unsupported results until
Gateway/Core/Nexus implementation and independent acceptance exist. No
BitVMX proof execution, pairing arithmetic, or production backend selection is
introduced by issue #1187.
- **Strategic Anchor**: Phase 7 Sovereign Redesign.
- **Linear Issue**: [CON-1311](https://linear.app/conxian-labs/issue/CON-1311)
