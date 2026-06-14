# FDC3 Interoperability Path (CON-1181)

This document defines the alignment path for Conxian Gateway and Conxian UI with the FDC3 (Financial Desktop Connectivity and Collaboration Consortium) standard.

## 1. Goal
Enable Conxian components to participate in enterprise financial workflows by supporting standard intents, context sharing, and app discovery.

## 2. Scope & Mapping

### A. Context Exchange
- **Current**: Conxian UI uses internal React state and URL parameters for context (e.g., selected asset, wallet address).
- **FDC3 Alignment**: Implement support for `fdc3.instrument` (for assets like BTC, sBTC) and `fdc3.contact` (for wallet addresses/identities).
- **Mapping**:
  - `ticker` -> Conxian Asset ID.
  - `address` -> Bitcoin/Stacks Address.

### B. Intents
- **Standard Intents**:
  - `ViewChart`: Open the Pulse dashboard for a specific asset.
  - `ViewQuote`: Show current price/liquidity for an asset.
  - `StartTransaction`: Initiate a swap or transfer intent in the UI.
- **Custom Conxian Intents**:
  - `conxian.ViewSettlement`: View L2/L3 settlement status for a transaction.
  - `conxian.SignPSBT`: Hand off a PSBT to a connected wallet application.

### C. App Discovery
- **Gateway Role**: The Gateway will expose an FDC3-compatible App Directory (`appD`) endpoint at `/api/v1/fdc3/appd` to describe available Conxian services.
- **UI Role**: Conxian UI will act as an FDC3 "App" that can be launched by a Desktop Agent (e.g., OpenFin, Glue42).

## 3. Implementation Roadmap

### Phase 1: Context Awareness (Q3 2026)
- Update Conxian UI to listen for FDC3 context events when running in a desktop agent.
- Map `fdc3.instrument` to the internal liquidity views.

### Phase 2: Intent Handling (Q4 2026)
- Register Conxian UI as a handler for `ViewChart` and `ViewQuote`.
- Implement basic intent resolution logic in the Gateway.

### Phase 3: Enterprise Integration (Q1 2027)
- Full `appD` support in the Gateway.
- Bi-directional context sharing between Conxian and legacy ERP/Terminal systems.

## 4. Trust & Security
- FDC3 interop must remain non-custodial. Context sharing is limited to public identifiers (addresses, tickers).
- Private keys and sensitive metadata are NEVER shared via FDC3 channels.

---
*Maintained by Jules (Sovereign Engineering Agent)*
