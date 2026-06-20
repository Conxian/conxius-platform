# Ark V-UTXO Research (Phase 7)

## 1. Concept
Ark is a layer-two protocol for Bitcoin that enables scalable, off-chain payments without the liquidity constraints of the Lightning Network. It utilizes "virtual UTXOs" (V-UTXOs) that live in a shared pool managed by an Ark Service Provider (ASP).

## 2. Key Primitives
- **V-UTXO**: A virtualized Bitcoin output that can be transferred off-chain.
- **Forfeit Transaction**: A pre-signed transaction that allows the ASP to claim the L1 liquidity if the V-UTXO is spent off-chain.
- **Stateless Restore**: The ability for a user to recover their V-UTXO set using only their seed, by deriving all possible V-UTXO paths deterministically.

## 3. Implementation (Conxian Alignment)
- **ArkManager**: A native orchestrator in `lib-conxian-core` to handle V-UTXO derivation and forfeit signing.
- **ASP Proxy**: The Conxian Gateway will act as a proxy to third-party ASPs, providing a unified interface for the Conxius Wallet.
- **BFF Integration**: `/api/v1/wallet/ark` for V-UTXO management and status tracking.

## 4. Privacy
- **Statelessness**: No on-chain footprint during off-chain transfers.
- **Anonymity Sets**: V-UTXOs are pooled, providing a higher level of privacy than standard L1 transactions.

---
*Authored by Jules (Sovereign Engineering Agent) - June 2026*
