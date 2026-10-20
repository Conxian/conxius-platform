> Qualification correction (2026-10-19): the original requirements below are a proposal, not implemented protocol support. Current code preserves only an explicit local simulator. The engine is unavailable pending provider qualification; see `2026-10-19-taproot-provider-boundary`. G-41 remains open.

# OpenSpec Proposal: G-41 Taproot Assets Protocol Engine (BIP-Taproot Assets / Taproot-Engine)

**Change ID:** `2026-10-17-g41-taproot-assets`
**Gap ID:** `G-41`
**Author:** Jules (Sovereign Engineering Agent)
**Date:** 2026-10-17
**Status:** Proposed

## Abstract
This proposal specifies the fail-closed Taproot Assets protocol engine for issuing, minting, transferring, and verifying asset commitments on Bitcoin Taproot outputs (MS-Taproot / Sparse Merkle Trees). The engine provides bounded capacity, explicit state machine transitions (`minted`, `transferring`, `transferred`, `burned`, `tombstoned`), cryptographic proof verification, and structured logging.

## Motivation & Context
Taproot Assets (formerly Taro) enables issuing arbitrary digital assets on the Bitcoin blockchain using Taproot script trees and Sparse Merkle Sum Trees (SMST). Implementing G-41 provides the Conxius platform with native Taproot Assets capabilities, enabling institutional asset issuance, multi-asset transfers, and state-verifiable proof handling.

## Scope & Specifications
- Asset Minting with unique Asset ID calculation (SHA-256 hash of genesis outpoint + asset tag + key).
- Asset State Machine: `minted` -> `transferring` -> `transferred` -> `burned` -> `tombstoned`.
- Sparse Merkle Tree Commitment Hash Verification.
- Max capacity enforcement (limit: 1,000 active asset commitment records).
- Structured logging via `createLogger("taproot-assets")`.
