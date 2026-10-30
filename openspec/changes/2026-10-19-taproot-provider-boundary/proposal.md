# G-41 Taproot Assets provider boundary

## Problem and scope
The candidate uses an in-memory map and local hashes instead of Taproot Assets protocol evidence. A hash-length predicate cannot verify an SMST proof; local mutations cannot establish issuance, ownership, transfer confirmation or burns. Platform is an orchestrator and must preserve provider ownership.

## Selected implementation
Retain the local state-machine research as `TaprootAssetsModel`, explicitly simulation-only. Return `simulated` for model transfers and label every model record. Keep the public `TaprootAssetsEngine` compatibility surface fail-closed: mutation operations throw an unavailable error, proof verification always returns false, and no records or success receipts are fabricated. Local model identifiers and hashes are not protocol asset IDs or commitment roots. Restore trusted current dev branch policy and PR template without the candidate's unrelated governance changes.

## Primary research reviewed 2026-10-19
- https://lightning.engineering/api-docs/api/taproot-assets/taproot-assets/verify-proof/ — VerifyProof consumes a proof file, not a 32-byte claimed hash.
- https://docs.lightning.engineering/the-lightning-network/taproot-assets/taproot-assets-protocol — protocol assets require issuance provenance and commitment validation.
- https://docs.lightning.engineering/lightning-network-tools/taproot-assets/first-steps — minting/sending involves actual daemon, Bitcoin confirmation and proof delivery.

## P order and acceptance
P0: reject arbitrary proofs and fabricated completion; add direct negative tests on both exported surfaces and preserve research. P1: Core/SDK/Nexus owners must select and pin a real verifier/provider, define authenticated operation-bound results, network/asset/input/finality binding, replay rules and issuer authorization. Only then add bounded authenticated provider transport in Platform. P2: measure performance/cost and consider packaging after correctness and independent acceptance. No custody, signing or protocol execution is added here. G-41 remains open/unqualified; model tests do not establish protocol compliance.
