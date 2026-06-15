# FDC3 Interoperability Path (CON-1181)

This document defines the alignment strategy for Conxian Gateway and Conxian_UI with the FDC3 (Financial Desktop Connectivity and Collaboration Consortium) standards.

## 1. Goal
Enable seamless interoperability between the Conxian stack and institutional financial desktops (e.g., Bloomberg Terminal, Symphony, OpenFin).

## 2. Context Sharing
Conxian will support standard FDC3 context types to allow other applications to follow the user's focus:
- **fdc3.instrument**: When viewing a specific asset (BTC, sBTC, STX), the UI will broadcast the instrument context.
- **fdc3.contact**: When viewing a counterparty or UBI identity, the UI will broadcast the contact context.

## 3. Financial Intents
The Gateway and UI will implement support for standard FDC3 intents:
- **ViewChart**: Open the price chart for a specific Bitcoin-native asset.
- **ViewQuote**: Retrieve real-time pricing and liquidity depth from the Stacks DEX.
- **TradeIntent**: Initialize a trade or swap intent that can be handled by the Conxian execution engine.

## 4. Implementation Status
- **Phase 1 (Discovery)**: Mapping internal CJCS (Conxian Job Card Schema) to FDC3 context types.
- **Phase 2 (Prototyping)**: Implementing an FDC3 Desktop Agent bridge in the Conxian UI.

---
*Maintained by Jules (Sovereign Engineering Agent)*
