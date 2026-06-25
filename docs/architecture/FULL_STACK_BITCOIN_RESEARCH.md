# Full Stack Bitcoin Research (Phase 7 Roadmap)

This document summarizes the research into the components required to achieve a "Full Bitcoin Stack" within the Conxian ecosystem.

## 1. RGB over Lightning (Broker/Dispatcher Model)
- **Concept**: Utilizing the Lightning Network as a transport and state-transition layer for RGB assets.
- **Broker/Dispatcher model**: The RGB node is split into a "Broker" (holding state) and a "Dispatcher" (handling LN communication). This allows the Conxius Wallet to interact with assets while the node stays isolated.
- **Benefits**: Enables private, high-throughput smart contracts on Bitcoin without bloating the L1.
- **Reference**: Iris Wallet patterns, LNP/BP standards.
- **Status**: Research lane (Partner integration).

## 2. BitVM Bridge (BBN)
- **Concept**: Optimistic verification for trustless Bitcoin bridges.
- **Peg-in/Peg-out Logic**:
  - **Peg-in**: Users lock BTC into a Taproot-based BitVM script. The prover commits to the minting state.
  - **Peg-out**: Users burn the L2 asset. The prover initiates a Bitcoin withdrawal. If the prover cheats, any verifier can challenge on-chain via BitVM fraud proofs.
- **Components**:
  - **Bridge App**: Peg-in/Peg-out interactions.
  - **Bridge Explorer**: Off-chain verification visibility.
  - **Bridge Dashboard**: Operational metrics.
- **Status**: Active scaffolding in UI-BFF and Wallet-BFF.

## 3. IVC-based Execution Layers (Nexus OS)
- **Concept**: Transitioning Nexus from a passive indexer to an Incrementally Verifiable Computation (IVC) machine.
- **IVC Machine Design**: Each block processing step generates a SNARK proof that is folded into the previous proof. This allows a client to verify the entire history of the Nexus state by checking a single small proof.
- **Goal**: ZK-verifiable off-chain orchestration with rapid settlement.
- **Status**: Conceptual redesign (Nakamoto-Style integrity).

## 4. Decentralized Secret Management (DSM)
- **Concept**: Commit-and-reveal schemes (F3B architecture) to neutralize MEV and front-running on Stacks DEX Factory V2.
- **Mechanism**: User intents are encrypted locally. The transaction is included in a block. Only after inclusion is the decryption key revealed by a decentralized committee, ensuring the miner cannot front-run the trade.

---
*Maintained by Jules (Sovereign Engineering Agent)*

## 5. SDK and Library Alignment (CON-1178)
- **Stacks JS**: Mostly converged on v7.4.x. Focus on bit-for-bit parity via Wasm.
- **Clarinet SDK**: Integration with Conxius Orbit for contract testing.
- **Enclave SDK**: Hardware-backed signing (StrongBox) for mobile/desktop.

## 6. Workflow Resilience
- **Fail-Closed Logic**: CI gates now enforce security and hygiene checks before any promotion.
- **Paths-Ignore**: Optimized to prevent documentation noise from blocking releases.
- **Self-Hosted Runners**: Transitioned to avoid external billing dependencies and increase execution speed.

## 7. Future Improvement Proposals
- **Wasm-First Gateway**: Transitioning performance-critical logic from Rust to Wasm for universal execution.
- **NixOS Declarative Control**: Moving from bash-based secret provisioning to SOPS/Nix for hermetic infrastructure.

---
*End of Research Update - June 2026*

## 8. Peer-Reviewed Foundations & Standards
- **FDC3 (Financial Desktop Connectivity and Collaboration Consortium)**:
  - Alignment for Conxian Gateway and UI to standard financial desktop contexts (Instrument, Contact).
  - Enables interoperability with Bloomberg Terminal, Symphony, and other institutional tools.
- **ISO 20022 Alignment**:
  - Bridging CJCS (Conxian Job Card Schema) to pacs.008/009 messages for tradfi integration.
- **BIP-174 (PSBT)**:
  - The core foundation for Wallet-BFF and multi-sig coordination.
- **Kind 20626 (Nostr P&L)**:
  - Leveraging the Nostr protocol for decentralized, censorship-resistant operational reporting.

## 9. Library Ecosystem
- **Stacks.js (v7.4+)**: Primary interface for Nakamoto-ready L2 interactions.
- **Iris Wallet / RGB-lib**: Patterns for client-side validation and Lightning integration.
- **Safe{Core} SDK**: Reference for multi-sig intent drafting and human-in-the-loop approvals.
- **Request Network SDK**: Basis for decentralized invoicing and payment tracking (BOS integration).

---
*Updated by Jules (Sovereign Engineering Agent) - 2026-06-14*

## 10. Strategic Implementation Proposals (CON-1197)
- **Universal Settlement Interface (USI)**: Standardizing cross-chain declarations via signed intents and verifiable proofs.
- **Hermetic NixOS Control Plane**: Replacing bash-based secret provisioning with declarative sops-nix and hermetic Nix flakes for high-assurance environments.
- **Micro-Frontend Federation**: Decomposing the Admin Dashboard into modular, local-first components to reduce organizational friction and improve resilience.

---
*Last Verified by Jules (Sovereign Engineering Agent) - 2026-06-15*

## 11. Expansion: Micro-Frontend Federation
- **Local-First Execution**: MFEs enable users to run specific business logic modules (e.g., Settlement Engine) in a local-only mode, reducing reliance on centralized cloud providers.
- **Resource Isolation**: Prevents "vibe-drift" by ensuring each module adheres to its own strict design and logic boundaries while sharing the 'Sovereign Earthy' design tokens.

## 12. Expansion: Wasm-First Architecture
- **Portability**: Transitioning logic to Wasm targets allows the same codebase to power the Gateway, the CLI (Orbit), and the Browser-based Wallet.
- **Security**: Wasm provides a sandboxed execution environment, enhancing the "Sentinel Security" model across the Conxian ecosystem.

## 13. Research Papers & Peer Review
- **[Draft] Verifiable Multi-Step Settlements via IVC**: A research paper draft exploring the use of Incrementally Verifiable Computation for complex cross-chain swaps.
- **[Draft] Sovereign Identity in UTXO Environments**: Exploring the intersection of BIP-174 and Decentralized Identifiers (DIDs).

## 14. Expansion: Operational Resilience
- **Containerization Hardening**: Resolved issues with `pnpm` built dependencies in Docker environments by explicitly allowlisting `sharp`. This ensures consistent builds across CI, local development, and production targets.

## 15. Universal Settlement Interface (USI) Integration (CON-1197)
The USI establishes a protocol-agnostic layer for cross-chain settlement.
- **Signed Intents**: Standardizing on BIP-322 for Bitcoin message signing and Clarity-native signing for Stacks.
- **Verification Logic**: Integrating `lib-conxian-core` (Wasm) into the Wallet-BFF to perform bit-for-bit parity checks on PSBTs before broadcast.
- **Atomic Swap Orchestration**: Leveraging BitVM for trustless, optimistic verification of cross-chain liquidity transfers.

## 16. Expansion: Peer-to-Peer State Transport
- **Nostr as a Transport Layer**: Utilizing Nostr relays for the asynchronous delivery of RGB state-transition data (consignment) between counter-parties.
- **Benefits**: Eliminates the need for a centralized "consignment server," aligning with the sovereign computing ethos.

## 17. Research: Formal Verification of Clarity Contracts
- **Coq-Clarity**: Exploring the use of the Coq proof assistant to formally verify high-value sBTC vault contracts.
- **Impact**: Provides mathematical certainty of contract correctness, crucial for institutional adoption.

---
*Updated by Jules (Sovereign Engineering Agent) - 2026-06-16*

## 18. Tier 1 UTXO Adapter Families (CON-710 to CON-713)
Research into secondary settlement layers to ensure multidimensional redundancy.
- **Liquid Network (CON-710)**: Implementation of Elements-based sidechain adapters for rapid, confidential issuance.
- **Rootstock (CON-711)**: EVM-compatible Bitcoin sidechain integration for legacy smart contract bridging.
- **Babylon (CON-712)**: Leveraging Bitcoin timestamping for PoS chain security and remote staking.
- **BitVM (CON-713)**: The primary optimism-based verification path for trustless bridges.

---
*Updated by Jules (Sovereign Engineering Agent) - 2026-06-16*


## 19. Expanded Tier 1 UTXO Research (CON-710 - CON-713)
- **Liquid Network Implementation Details**:
  - Utilizing `elements-miniscript` for policy-based confidential assets.
  - Researching Dynamic Federations (DynaFed) for adaptive block signing.
- **Rootstock (RSK) Bridge Patterns**:
  - Evaluating Powpeg security models vs. BitVM-based optimism.
  - Standardizing on RSK-native RIF (Rootstock Infrastructure Framework) for decentralized storage and naming.
- **Babylon Bitcoin Staking**:
  - Integration of EOTS (Extractable One-Time Signatures) for slashable security on PoS chains.
  - Mapping the "Finality Provider" role to the Conxian Gateway operator profile.
- **BitVM2 "Covenant-less" Verification**:
  - Shifting from BitVM1 (single prover/verifier) to BitVM2 (multi-verifier, optimistic) for the sBTC bridge logic.
  - Researching 'Winternitz One-Time Signatures' for efficient on-chain challenges.

## 20. Research Bibliography & Academic Foundations
- **Verifiable Computation**:
  - *Proof-Carrying Data (PCD) via Folding Schemes* (Nova, Sangria).
  - *Incrementally Verifiable Computation (IVC)* - P. Valiant (2008).
- **Bitcoin Scripting & Covenants**:
  - *BitVM: Compute Anything on Bitcoin* - Robin Linus (2023).
  - *Simplicity: A New Language for Blockchains* - Russell O'Connor (2017).
- **Privacy & Assets**:
  - *RGB: Scalable & Confidential Smart Contracts on Bitcoin/Lightning* - Dr. Maxim Orlovsky.
  - *Taproot Assets (formerly Taro)* - Roasbeef (2022).
- **Cross-chain Interoperability**:
  - *LayerZero: Trustless Omni-chain Interoperability Protocol* - Zarick et al. (2021).
  - *Axelar: Cross-Chain Communication for the Multi-Chain Future* - Gorbunov et al. (2022).

---
*Updated by Jules (Sovereign Engineering Agent) - June 20, 2026*

## 21. Technical Deep Dive: BitVM2 Verification Floor (v1.9.2)
- **Groth16 Chunking**: Verification is split into **364 independent taps**.
  - **VALIDATING_TAPS (1)**: Core arithmetic verification logic.
  - **HASHING_TAPS (363)**: Hash chain verification for intermediate state transitions.
- **On-Chain Execution**: Utilizing `bitvm::groth16::verifier::Verifier::hinted_verify` to generate scripts and hints.
- **Optimistic Bridge**: Provers commit to state; verifiers can challenge any of the 364 chunks if fraud is detected.

## 22. Institutional Bridge: FDC3 Native Resolver (v1.9.2)
- **Standard**: FINOS FDC3 v2.0 Desktop Agent.
- **Core API**: `getAgent()` for intent raising and context sharing.
- **Intent Mapping**:
  - `ViewInstrument`: Maps to Conxian sBTC/BTC asset pairs.
  - `ViewContact`: Maps to UBI-linked sovereign identities.
  - `RaiseIntent('Trade')`: Orchestrates USI settlement flows via Wallet-BFF.
- **Module Roles**: Utilizing `@finos/fdc3-agent-proxy` for client-side DACP implementation.

## 23. Sovereign P&L Transport (Nostr Kind 20626)
- **Concept**: Decentralized, censorship-resistant delivery of operational telemetry and P&L reports.
- **Implementation**: Gateway Sentinel signs Kind 20626 events; Wallet-BFF acts as a proxy to Nostr relays.
- **Benefit**: Provides institutional auditability and "Proof of Solvency" signals without centralized cloud dependencies.
- **Alignment**: Phase 7 BFF Topology (CON-800).

## 24. USI Proof Folding (Nova/Sangria)
- **Concept**: Utilizing IVC folding schemes to condense multi-step settlement proofs into a single, compact verification artifact.
- **Orchestration**: Nexus OS performs the folding; UI-BFF provides the "Last Mile" verification endpoint.
- **Efficiency**: Reduces client-side verification time from ~500ms to <50ms for complex swap sequences.

## 25. Ark V-UTXO Protocol (v1.9.2)
- **V-UTXO Management**: Deterministic derivation using Blake2s PRF for stateless recovery.
- **Forfeit Signing**: Automated signing of forfeit transactions during V-UTXO transfers to ensure ASP atomicity.
- **Roadmap**: Integration into the Wallet-BFF for non-custodial scalability.

## 26. Deep Dive: Discreet Log Contracts (DLC) Maturity (v1.9.2)
- **Concept**: DLCs allow for private, efficient, and trustless financial contracts on Bitcoin (e.g., derivatives, insurance) using an oracle to sign the outcome without the oracle knowing the contract details.
- **Implementation (rust-dlc)**: Leveraging  and  for contract execution.
- **Integration**: Mapped to the USI for "Layer 1 Native Finance".
- **Roadmap**: Pilot phase for DLC-based stablecoin collateralization (ctUSD alignment).

## 27. Nostr Wallet Connect (NWC) & Remote Signing (NIP-46/47)
- **Non-Custodial Auth**: Utilizing NWC (NIP-47) for authorizing Lightning payments without sharing macaroons or static keys.
- **Bunker (NIP-46)**: Remote signing of USI intents. The Conxius Wallet acts as a "Bunker Client", while the user's mobile enclave acts as the "Bunker".
- **Transport Layer**: Nostr relays provide the censorship-resistant transport for signed USI intents (Kind 20626).

## 28. Bitcoin ZK-Rollups: Citrea & Strata (v1.9.2)
- **Citrea (Clementine Bridge)**:
  - Uses BitVM2 for 1-of-N trust-minimized settlement.
  - EVM-compatible execution environment on Bitcoin.
- **Strata (Alpen Labs)**:
  - Focus on a high-throughput "settlement layer" for Bitcoin.
  - Utilizing recursive ZK-proofs to scale transaction density.
- **Strategic Path**: Tier 1 Adapter integration for both Citrea and Strata to ensure "Multidimensional Liquidity".

## 29. BIP-322: Universal Message Signing
- **Standard**: Standardizing on BIP-322 for all USI "Signed Intents".
- **Verification**:  (Wasm) performs BIP-322 signature verification for Bitcoin L1 addresses (P2WPKH, P2TR).
- **Benefit**: Unified signature format for legacy, segwit, and taproot addresses.

## 26. Deep Dive: Discreet Log Contracts (DLC) Maturity (v1.9.2)
- **Concept**: DLCs allow for private, efficient, and trustless financial contracts on Bitcoin (e.g., derivatives, insurance) using an oracle to sign the outcome without the oracle knowing the contract details.
- **Implementation (rust-dlc)**: Leveraging `pdlc` and `rust-dlc` for contract execution.
- **Integration**: Mapped to the USI for "Layer 1 Native Finance".
- **Roadmap**: Pilot phase for DLC-based stablecoin collateralization (ctUSD alignment).

## 27. Nostr Wallet Connect (NWC) & Remote Signing (NIP-46/47)
- **Non-Custodial Auth**: Utilizing NWC (NIP-47) for authorizing Lightning payments without sharing macaroons or static keys.
- **Bunker (NIP-46)**: Remote signing of USI intents. The Conxius Wallet acts as a "Bunker Client", while the user's mobile enclave acts as the "Bunker".
- **Transport Layer**: Nostr relays provide the censorship-resistant transport for signed USI intents (Kind 20626).

## 28. Bitcoin ZK-Rollups: Citrea & Strata (v1.9.2)
- **Citrea (Clementine Bridge)**:
  - Uses BitVM2 for 1-of-N trust-minimized settlement.
  - EVM-compatible execution environment on Bitcoin.
- **Strata (Alpen Labs)**:
  - Focus on a high-throughput "settlement layer" for Bitcoin.
  - Utilizing recursive ZK-proofs to scale transaction density.
- **Strategic Path**: Tier 1 Adapter integration for both Citrea and Strata to ensure "Multidimensional Liquidity".

## 29. BIP-322: Universal Message Signing
- **Standard**: Standardizing on BIP-322 for all USI "Signed Intents".
- **Verification**: `lib-conxian-core` (Wasm) performs BIP-322 signature verification for Bitcoin L1 addresses (P2WPKH, P2TR).
- **Benefit**: Unified signature format for legacy, segwit, and taproot addresses.

## 26. Deep Dive: Discreet Log Contracts (DLC) Maturity (v1.9.2)
- **Concept**: DLCs allow for private, efficient, and trustless financial contracts on Bitcoin (e.g., derivatives, insurance) using an oracle to sign the outcome without the oracle knowing the contract details.
- **Implementation (rust-dlc)**: Leveraging `pdlc` and `rust-dlc` for contract execution.
- **Integration**: Mapped to the USI for "Layer 1 Native Finance".
- **Roadmap**: Pilot phase for DLC-based stablecoin collateralization (ctUSD alignment).

## 27. Nostr Wallet Connect (NWC) & Remote Signing (NIP-46/47)
- **Non-Custodial Auth**: Utilizing NWC (NIP-47) for authorizing Lightning payments without sharing macaroons or static keys.
- **Bunker (NIP-46)**: Remote signing of USI intents. The Conxius Wallet acts as a "Bunker Client", while the user's mobile enclave acts as the "Bunker".
- **Transport Layer**: Nostr relays provide the censorship-resistant transport for signed USI intents (Kind 20626).

## 28. Bitcoin ZK-Rollups: Citrea & Strata (v1.9.2)
- **Citrea (Clementine Bridge)**:
  - Uses BitVM2 for 1-of-N trust-minimized settlement.
  - EVM-compatible execution environment on Bitcoin.
- **Strata (Alpen Labs)**:
  - Focus on a high-throughput "settlement layer" for Bitcoin.
  - Utilizing recursive ZK-proofs to scale transaction density.
- **Strategic Path**: Tier 1 Adapter integration for both Citrea and Strata to ensure "Multidimensional Liquidity".

## 29. BIP-322: Universal Message Signing
- **Standard**: Standardizing on BIP-322 for all USI "Signed Intents".
- **Verification**: `lib-conxian-core` (Wasm) performs BIP-322 signature verification for Bitcoin L1 addresses (P2WPKH, P2TR).
- **Benefit**: Unified signature format for legacy, segwit, and taproot addresses.

## 30. Silent Payments (BIP-352): Reusable Privacy
- **Concept**: Reusable donation addresses that don't reveal the recipient's identity on-chain and prevent address reuse without per-transaction interaction.
- **Implementation**: `lib-conxian-core` implementation for scanning and spending Silent Payments.
- **Benefit**: Enhances privacy for corporate treasury and payroll without the overhead of BIP-47 Notification transactions.

## 31. MuSig2 (BIP-327): Efficient Multi-Sig
- **Concept**: Next-generation Schnorr-based multi-signature scheme that allows multiple signers to aggregate their keys and signatures into a single public key and signature.
- **Integration**: Standardizing USI multi-sig intents on MuSig2 for Taproot (P2TR) script paths.
- **Performance**: Reduces transaction size and fee cost by ~30-50% compared to legacy `OP_CHECKMULTISIG`.

## 32. BIP-353: DNS Payment Instructions (v1.9.2)
- **Concept**: Standard for encoding BIP-21 URI schemes in DNS TXT records using DNSSEC for cryptographic verification.
- **Integration**: Mapping human-readable names (e.g., ₿user@domain) to Conxian payment instructions.
- **Verification**: UI-BFF and Wallet-BFF perform DNSSEC-validated lookups to resolve intents.
- **Benefit**: Provides a global, hierarchical namespace for payment discovery that works with existing hardware wallets and maintains relative privacy via ISP/VPN proxies.

## 33. Layer 3 Application-Specific Rollups (v1.9.2)
- **Concept**: Specialized execution layers (L3s) built on top of Bitcoin L2s (like Stacks or Citrea) to provide tailored environments for specific Conxian DeFi primitives.
- **Strategic Value**: Allows for hyper-optimized performance for the DEX Factory V2 or high-frequency order books without competing for L1/L2 block space.
- **Implementation**: Researching the use of "Rollup-as-a-Service" (RaaS) providers that support Bitcoin settlement.
- **Alignment**: Enhances the "Multidimensional Liquidity" model by providing dedicated execution lanes.

## 34. FROST (Flexible Round-Optimized Schnorr Threshold Signatures)
- **Concept**: A threshold signature scheme (TSS) that allows $t$-of-$n$ signers to produce a standard Schnorr signature.
- **Benefits**:
  - **Single Round**: Allows for single-round signing in the non-interactive case.
  - **Standard Signature**: Produces a signature that is indistinguishable from a single-party Schnorr signature on-chain.
  - **Privacy**: Hides the signer set and threshold from the blockchain.
- **Integration**: Target for Conxian corporate treasury and institutional vault management.
- **Implementation**: Leveraging `frost-dalek` or `roast` for robust multi-party computation.

## 35. OP_CAT: Recursive Covenants and Beyond
- **Concept**: A proposed (restored) opcode that concatenates two elements on the stack.
- **Strategic Impact**:
  - **Recursive Covenants**: Enables complex spending conditions that can persist across transaction chains.
  - **Vaults**: Simplifies the implementation of secure Bitcoin vaults.
  - **L2 Scaling**: Provides a foundation for more efficient ZK-rollup bridges (e.g., Starknet on Bitcoin).
- **Alignment**: Monitoring the BIP-347 progress for integration into the Conxian USI.

## 36. Fedimint: Federated Chaumian Mints
- **Concept**: A modular framework for building federated Chaumian mints that settle on Bitcoin and Lightning.
- **Value Proposition**:
  - **Privacy**: Strong sender/receiver anonymity within the federation.
  - **Scalability**: High-throughput off-chain transactions.
  - **Community Custody**: 1-of-$N$ trust model based on community guardians.
- **Integration**: Researching Fedimint as a Tier 2 adapter for community-scale liquidity pools.

## 37. Simplicity: High-Assurance Verification
- **Concept**: A low-level, functional language for Bitcoin smart contracts that allows for formal verification of safety and correctness.
- **Role in USI**: Providing a "High-Assurance" lane for settlement intents where the logic is provably correct.
- **Integration**: `lib-conxian-core` (Wasm) acting as a Simplicity runtime or bridge to an external verifier.

## 38. BIP-324: Encrypted P2P Transport
- **Concept**: A new encrypted transport protocol for the Bitcoin P2P network to protect against censorship and eavesdropping.
- **Strategic Value**: Enhancing the privacy of Gateway-to-Nexus and Nexus-to-Relay communication.
- **Implementation**: Integrating a Rust-based BIP-324 library into the Nexus transport layer.

## 39. Spider Network: Scalable Routing
- **Concept**: A proposed scaling layer for Bitcoin that utilizes state-channel-based routing to achieve high throughput.
- **Alignment**: Providing a decentralized transport for USI "Maneuver" events (Kind 20626).
- **Research**: Monitoring the integration path for Spider-compatible relays.

## 40. BitVM3: Adaptive Proof Verification
- **Concept**: The next evolution of BitVM, focusing on reduced on-chain footprint and "Adaptive" fraud proofs.
- **Benefit**: Significantly lowers the cost of "Disprove" transactions and increases verifier efficiency.
- **Roadmap**: Planned upgrade for the G-01 BitVM2 Verification Floor once the specification stabilizes.

## 41. Taproot Assets (v1.9.3)
- **Concept**: A Taproot-native protocol for issuing and transferring assets on the Bitcoin blockchain, utilizing Merkleized Abstract Syntax Trees (MAST).
- **Integration**: Mapped to the USI as a Tier 2 adapter.
- **Benefit**: High efficiency and compatibility with the Lightning Network for multi-asset routing.

## 42. PTLCs (Point Time Locked Contracts)
- **Concept**: Next-generation Lightning payment primitive using adaptor signatures instead of hashes (HTLCs).
- **Advantage**: Prevents payment correlation across routes and enables more complex multi-hop conditions.
- **Roadmap**: Planned transition for the Wallet-BFF and Lightning adapters in Phase 8.

## 43. Babylon Bitcoin Staking (CON-712)
- **Concept**: A trustless Bitcoin staking protocol that allows BTC holders to stake their coins to secure Proof-of-Stake (PoS) chains without giving up custody or using a bridge.
- **Mechanism**: Utilizes Bitcoin's scripting capabilities (specifically Taproot) to implement slasher conditions and staking contracts.
- **Integration**: Mapped as a Tier 3 Experimental adapter for USI.
- **Benefit**: Provides a new yield-generating primitive for Conxian corporate treasury.

## 44. BitVMX: High-Efficiency Computation
- **Concept**: A successor to the BitVM design that optimizes for general-purpose computation on Bitcoin with significantly reduced on-chain overhead.
- **Strategic Value**: Providing a more flexible execution environment for the Nexus Glass Node.
- **Alignment**: Part of the Phase 7 "Verification Floor" evolution path.

## 45. BOLT-12 (Lightning Offers)
- **Concept**: A proposal for static, reusable Lightning invoices that support refunds, subscriptions, and recurring payments.
- **Advantage**: Eliminates the need for a backend to generate invoices for every payment, enhancing privacy and reducing infrastructure load.
- **Integration**: Target for the Wallet-BFF and Merchant-BFF interfaces.

## 46. RGB++ Protocol
- **Concept**: An extension of the RGB protocol that utilizes a "turing-complete" L2 (like CKB) as a data availability and execution layer for Bitcoin-native assets.
- **Benefit**: Simplifies the management of RGB assets while maintaining the security of the Bitcoin L1.
- **Alignment**: Tier 2 Adapter candidate for multi-asset liquidity.
