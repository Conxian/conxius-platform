# MuSig2 Aggregation Hardening Capability

## ADDED Requirements

### Requirement: Enforce Capacity Bounds and TTL Expiration on MuSig2 Signing Sessions

The MuSig2 engine MUST enforce maximum capacity bounds (1,000 active sessions) and TTL expiration (24 hours) to prevent state bloat and stale multi-party signature coordination.

#### Scenario: Capacity limit exceeded
- **WHEN** a client attempts to create a 1,001st active MuSig2 signing session without clearing old sessions
- **THEN** the engine MUST throw an error indicating session capacity limit exceeded.

#### Scenario: Expired session interaction
- **WHEN** a participant submits a nonce or partial signature for a session older than 24 hours
- **THEN** the engine MUST reject the submission and mark the session as failed or expired.
