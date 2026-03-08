# Design: System Alignment V2

## 1. Architectural Overview
The architecture follows the "Fusion" pattern, consolidating all logic into the lib-conxian-core Gateway while maintaining modular sub-systems for specialized tasks.

## 2. Module Specifications (Gateway Engine)
- **MeshModule**: Responsible for atomic swap state machines and cross-chain communication.
- **NexusModule**: Manages the Merkle Tree of off-chain states and ZK-proof generation.
- **ComplianceModule**: Handles risk scoring, AML/KYC checks, and MVCR logic.

## 3. Submodule Specifications (UI/Client)
- **IntentManager**: Centralized client-side logic for signing and dispatching enclave-protected intents.
- **TelemetryClient**: Consumes the refined `/api/v1/status` and `/api/v1/layers` endpoints for high-fidelity visualization.

## 4. Data Models
- **NexusState**: `{ merkle_root: string, last_block: u64, active_proofs: u32 }`
- **GlobalMeshSwap**: `{ swap_id: string, source_chain: string, target_chain: string, amount: f64, status: string }`
