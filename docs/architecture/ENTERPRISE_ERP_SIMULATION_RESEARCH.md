# Phase 7 Research: Enterprise ERP Simulation & Programmable Mock Engines

This research document outlines the integration map and simulation strategy for bridging traditional enterprise ERP (Enterprise Resource Planning) systems with the Conxian sovereign protocol layers.

## 1. Enterprise Integration Map

To ensure robust, end-to-end transaction validity and system anti-fragility without requiring live connections to institutional production ERP networks, Conxian establishes a high-fidelity local simulation harness.

```
+-----------------------------------------------------------------------------------+
|                           Programmable Enterprise Engines                         |
|                                                                                   |
|  +------------------------+  +--------------------------+  +-------------------+  |
|  |   Mockoon API Engine   |  |  WireMock Virtualization |  |  ERPNext Sandbox  |  |
|  |  (Deterministic REST)  |  |  (Stateful & Faults)     |  |  (Frappe REST)    |  |
|  +------------------------+  +--------------------------+  +-------------------+  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | JSON-RPC / REST Payloads
                                          v
+-----------------------------------------------------------------------------------+
|                               conxian-gateway                                     |
|  - Middleware and API pooling                                                     |
|  - ZKML compliance checking                                                       |
|  - x402 payment-header injection and verification                                 |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | State roots & MMR commitments
                                          v
+-----------------------------------------------------------------------------------+
|                                conxian-nexus                                      |
|  - Indexing & Transaction State Routing                                           |
|  - Verification Proof Generation                                                  |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          | Consensus commitments
                                          v
+-----------------------------------------------------------------------------------+
|                  Clarinet SDK / Local Stacks Devnet (Conxian)                     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Programmable Mock Enterprise Engines

### A. Mockoon API Engine (Deterministic REST Mocking)
Mockoon serves as the primary local mock server tool for engineering teams to design deterministic REST/GraphQL endpoints.
- **Use Case**: Designing API responses that mirror enterprise ERP events (e.g., invoices created, payment authorizations, treasury transfers).
- **Capabilities**: Easily scripts dynamic JSON responses to simulate complex enterprise ERP events for the `conxian-gateway` middleware.
- **Example Endpoint Configuration**:
  - `GET /api/v1/erp/invoices`: Returns a static or templated array of unpaid customer invoices.
  - `POST /api/v1/erp/invoice/checkout`: Responds with HTTP 402 + the `PAYMENT-REQUIRED` payload configured for the action.

### B. WireMock Enterprise Simulation (API Virtualization)
WireMock simulates high-performance, stateful behavior, network latency, and fault injection within the testing pipelines.
- **Use Case**: Testing the robustness of Conxian's Nakamoto-Guardian compliance policies, rate limits, and anti-fragility monitoring.
- **Capabilities**:
  - **Stateful Scenarios**: Tracks state transitions across successive calls (e.g., first call returns `unpaid`, second returns `processing`, third returns `settled` once payment signature is propagated).
  - **Fault Injection**: Simulates random network socket drops, empty payloads, malformed HTTP headers, or high latency spikes (>5000ms) to ensure the client/gateway fails closed and handles timeouts safely.

### C. ERPNext Cloud Sandbox (Frappe Cloud Sandbox)
ERPNext offers a clean Python/REST API backend with complete, production-realistic business logic (Invoicing, Treasury, Ledgers).
- **Use Case**: Pulling raw enterprise invoicing data and auditing treasury records down through the `lib-conxian-core` engine.
- **Capabilities**:
  - Query raw accounts, ledger entries, and pending obligations via standard Frappe REST endpoints.
  - Process complex business lifecycles directly and trigger Gateway webhooks upon invoice issuance.

---

## 3. Data Schema & Core Primitives

### A. x402 Mandate Schema
Any commercial ERP invoice that is routed through the `conxian-gateway` is subjected to an x402 challenge-response flow when payments are missing.

```json
{
  "mandateId": "mandate-erp-1004",
  "invoiceRef": "INV-ERP-789",
  "paymentAddress": "bc1qztwy6xen3zdtt7z0vrgapmjtfz8acjkfp5fp7l",
  "amountSats": 250000,
  "status": "signed",
  "payloadHash": "sha256-abc123xyz..."
}
```

### B. Ledger Entries Simulation
Ledger entries generated in the mock enterprise environment are reconciled down into the Stacks Devnet via state roots and Merkle Mountain Range (MMR) commitments published to the `conxian-nexus`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID / String | Unique ledger transaction tracking key. |
| `account` | String | Enterprise Chart of Accounts record identifier. |
| `debitCredit` | Enum | Indicates whether the transaction is a debit or credit entry. |
| `amount` | String (Decimal) | Financial amount denominated in fiat, BTC, or sBTC. |
| `stateRootCommitment` | Hex String | Merkle root of the batch compiled for Nexus consensus anchoring. |

---

## 4. Verification and Anti-Fragility Policies

1. **Timeout Integrity**: Gateway requests to ERP backends must time out within 2.5 seconds to protect downstream UI/UX latency budgets.
2. **Fail-Closed on Faults**: If a WireMock simulation triggers an error (e.g. 500 Internal Server Error) or a socket timeout, the Gateway must abort the settlement pipeline, revert pending status in `conxian-nexus`, and emit a high-priority system telemetry log.
3. **Double-Spend Prevention**: Re-routing any invoice or mandate that is already in a `processing` state is blocked at the gateway.

---
*Documented by Jules (Sovereign Engineering Agent) - July 2026*
