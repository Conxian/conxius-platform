# Proposal: OpenSpec Proposal for G-23 Ark V-UTXO Protocol Engine

**Change Name:** `2026-09-30-g23-ark-vutxo-protocol`
**Status:** `proposed`
**Gap ID:** `G-23`
**Target Services:** `services/admin-dashboard`

## 1. Executive Summary
This proposal introduces a fail-closed, memory-bounded Ark V-UTXO (Virtual Unspent Transaction Output) protocol state engine in `services/admin-dashboard/src/lib/support/ark.ts`. It provides end-to-end management of off-chain Bitcoin V-UTXOs under an Ark Service Provider (ASP) model, supporting boarding (L1 -> V-UTXO), off-chain transfers, forfeit transaction registration, double-spend protection, collaborative & unilateral unboarding, and relative exit timelock verification.

## 2. Motivation & Requirements
Ark is an off-chain Bitcoin L2 protocol enabling instant, low-cost payments without Lightning liquidity constraints. To integrate Ark safely into the Conxius platform BFF, the Ark adapter must enforce:
1. Fail-closed state transitions across V-UTXO lifecycle states (`boarded`, `available`, `locked`, `spent`, `forfeited`, `unboarded`, `expired`, `tombstoned`).
2. Maximum capacity limits (1,000 active V-UTXOs) to prevent memory exhaustion.
3. Forfeit transaction registration for ASP protection against double spending during L1 exit.
4. Relative timelock verification for unilateral exit paths.
5. High-fidelity unit tests ensuring 100% test coverage and zero regression risk.

## 3. Specifications
See `specs/ark-vutxo-protocol/spec.md`.
