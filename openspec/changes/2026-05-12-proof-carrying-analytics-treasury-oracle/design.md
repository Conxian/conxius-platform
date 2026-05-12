# Design: CON-331 Proof-Carrying Analytics Pilot (Treasury + Oracle)

## 1) Proof-worthy pilot workloads

The pilot treats the following workloads as mandatory proof-carrying reads:

1. **Treasury solvency snapshots** used for risk limits and reserve controls.
2. **Runway metric** when used to trigger treasury policy (throttles, spend controls, escalation).
3. **Oracle-facing outputs** that affect pricing/risk behavior.
4. **Published balance attestations** distributed to compliance/investor audiences.

Exploratory dashboards and internal telemetry remain non-proof analytics in this pilot.

## 2) Verification path (fail-closed)

For each proof-worthy read, Gateway MUST require all artifacts:

- query `result`,
- cryptographic `proof`,
- commitment metadata (`commitment`, `commitment_type`, `query_hash`, `params_hash`, anchor data).

### Verification sequence

1. Gateway requests a pre-approved query template execution from Control Plane.
2. Control Plane obtains `result + proof + commitment` from the proof-capable analytics engine.
3. Gateway verifier recomputes query/parameter hashes and verifies proof validity against commitment.
4. Gateway freshness guard checks:
   - Bitcoin anchor height and hash,
   - Stacks tip context,
   - `burn_block_height` lag against configured thresholds.
5. If verification and freshness pass, Gateway signs an attestation envelope.
6. Consumers accept only signed, valid, fresh envelopes.
7. Any verification or freshness failure => **no publish / no state-affecting action**.

## 3) Pilot architecture and rollout slice

```text
Source systems
  -> Ingestion policy + trust classing
  -> Proof-capable analytics engine (approved templates only)
  -> Gateway verifier service (offchain)
  -> Signed attestation envelope store
  -> Treasury policy consumer + Oracle consumer
```

### Rollout slice

- **Slice A (shadow mode):** Treasury solvency and runway metrics generated via proof path, compared to current production outputs; no enforcement.
- **Slice B (single enforced path):** One treasury policy control consumes attested solvency/runway only.
- **Slice C (oracle pilot):** One oracle risk summary path switched to fail-closed attested consumption.

Exit criteria between slices: verification pass rate, freshness compliance, latency budget, and divergence within approved tolerance.

## 4) OLTP vs analytics migration boundary

- **OLTP authority:** transaction execution, settlement/finality, canonical balance mutation stays in Gateway/Nexus.
- **Analytics authority:** derived views, aggregates, and policy inputs only.
- Analytics outputs MUST NEVER directly mutate protocol state.
- Bridge rule: only attested outputs may gate policy decisions; raw analytics responses are non-authoritative.

## 5) Stacks-native integration constraints

1. Use Bitcoin + Stacks context in every attestation (`bitcoin_height`, `bitcoin_hash`, `stacks_tip`, `burn_block_height`).
2. Freshness checks MUST include `burn_block_height` lag thresholds, not just wall-clock age.
3. Verifier remains offchain for pilot phase; Stacks contracts consume signed envelopes, not raw proof objects.
4. Attestation signatures MUST use Gateway-managed keys with rotation policy and key identifier (`kid`) surfaced to consumers.
5. Onchain consumers must fail closed when envelope signature, freshness, or anchor continuity checks fail.

## 6) Gateway / Control Plane interface definitions

### 6.1 Execute proof query (Gateway -> Control Plane)

`POST /api/v1/analytics/proof-query/execute`

```json
{
  "request_id": "uuid",
  "query_template_id": "treasury-solvency-v1",
  "query_version": "2026-05-12",
  "params": {"as_of_epoch": 12345},
  "params_hash": "sha256:...",
  "consumer": "treasury-policy",
  "anchor_requirements": {
    "max_bitcoin_lag_blocks": 6,
    "max_burn_block_lag": 3
  }
}
```

Success response:

```json
{
  "request_id": "uuid",
  "result": {"total_assets": "...", "total_liabilities": "..."},
  "result_hash": "sha256:...",
  "proof": "base64:...",
  "proof_type": "sxt-proof-of-sql-v1",
  "commitment": "0x...",
  "commitment_type": "merkle-root",
  "query_hash": "sha256:...",
  "params_hash": "sha256:...",
  "anchor": {
    "bitcoin_height": 890000,
    "bitcoin_hash": "000000...",
    "stacks_tip_height": 210000,
    "stacks_tip_burn_block_height": 889998,
    "burn_block_height": 889998
  },
  "produced_at": "2026-05-12T00:00:00Z"
}
```

### 6.2 Verify and attest (Gateway internal verifier)

`POST /api/v1/analytics/attestations/verify-and-sign`

```json
{
  "request_id": "uuid",
  "query_response": "<payload from execute endpoint>",
  "required_anchor": {
    "min_bitcoin_height": 889994,
    "min_burn_block_height": 889994
  },
  "consumer": "treasury-policy"
}
```

Response:

```json
{
  "verification_status": "verified",
  "freshness_status": "fresh",
  "attestation_envelope": "<signed envelope object>",
  "attestation_id": "att_..."
}
```

## 7) Attestation envelope schema (concrete fields)

```json
{
  "schema_version": "conxian.analytics.attestation.v1",
  "attestation_id": "att_01...",
  "issued_at": "2026-05-12T00:00:00Z",
  "expires_at": "2026-05-12T00:05:00Z",
  "consumer": "treasury-policy",
  "query_template_id": "treasury-solvency-v1",
  "query_version": "2026-05-12",
  "query_hash": "sha256:...",
  "params_hash": "sha256:...",
  "result_hash": "sha256:...",
  "proof_hash": "sha256:...",
  "proof_type": "sxt-proof-of-sql-v1",
  "commitment": "0x...",
  "commitment_type": "merkle-root",
  "anchor": {
    "bitcoin_height": 890000,
    "bitcoin_hash": "000000...",
    "stacks_tip_height": 210000,
    "burn_block_height": 889998
  },
  "freshness_policy": {
    "max_bitcoin_lag_blocks": 6,
    "max_burn_block_lag": 3
  },
  "verification": {
    "proof_valid": true,
    "anchor_valid": true,
    "fresh": true
  },
  "signing": {
    "alg": "EdDSA",
    "kid": "gateway-attestation-key-2026-05",
    "sig": "base64url:..."
  }
}
```

Consumer contract:

- Reject if signature invalid, envelope expired, or freshness/anchor checks fail.
- Reject if `verification.proof_valid != true`.
- Reject if `(query_hash, params_hash, result_hash)` does not match expected request context.

