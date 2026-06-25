# G-11: BitVM2 Multi-Party Aggregation (CON-1306)

## Context
BitVM2 utilizes a 1-of-N trust model where any single honest verifier can challenge and disprove a fraudulent execution. To scale this to institutional levels, the Conxian platform requires a multi-party aggregation layer to coordinate signatures and challenges across a federation of verifiers.

## Goal
Implement the BFF-level scaffolding for multi-party aggregation, enabling the coordination of 364-tap verification trees and MuSig2-based signature aggregation.

## Phased Breakdown
### Phase 1: BFF Scaffolding (Current Session)
- Initialize `MultiPartyAggregator` in the Admin Dashboard.
- Define data structures for partial signatures and aggregation states.
- Implement API endpoints for signature submission and status retrieval.
- Establish unit test baseline for aggregation logic.

### Phase 2: Taproot Tree Logic
- Implement the 364-tap Groth16 verification tree generation in `lib-conxian-core`.
- Expose the tree structure to the BFF for challenge coordination.

### Phase 3: MuSig2 Integration
- Integrate with `lib-conxian-core` MuSig2 modules for real signature aggregation.
- Implement session management for partial signature collection.

### Phase 4: Production Hardening
- Replace in-memory maps with Redis-backed persistence for aggregation state.
- Implement webhook notifications for completed aggregations or detected challenges.

## Technical Requirements
- **Taproot Tree Generation**: Ability to represent and manage the 364 verification taps required for BitVM2 Groth16 verification.
- **MuSig2 Integration**: Support for partial signature collection and aggregation for multi-party agreement.
- **Challenge Coordination**: A state machine to track which verifiers have submitted signatures and which taps are being challenged.

## Alignment
- **Strategic Anchor**: Phase 7 Sovereign Redesign.
- **Linear Issue**: [CON-1306](https://linear.app/conxian-labs/issue/CON-1306)
