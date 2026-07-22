# Design: Revenue Automation Protocol Handoff and Policy Boundary

## 1. Ownership boundary

The system is split into an authoritative protocol lane and a non-authoritative
platform lane:

```text
Conxian/Conxian protocol repository
  ├─ Clarity contract and protocol tests
  ├─ deployment manifests and deployment policy
  ├─ fee-bearing flow registration
  └─ economic policy and governance
              │ authoritative outputs/state
              ▼
conxius-platform / Gateway control plane
  ├─ route protocol-authoritative fee/payout instructions
  ├─ expose operational feature flags and runbooks
  ├─ disable platform payout operations when unsafe
  └─ observe and report outcomes without custody
```

The platform MUST NOT add a local Clarity contract, deploy or modify the
protocol contract, calculate a competing canonical fee, or represent routed
assets as platform custody. Protocol state and protocol-authoritative outputs
remain the source of truth.

## 2. Observed baseline versus normative policy

The current observed upstream implementation contains `PROTOCOL_FEE_BPS u100`,
which is a 100 bps / 1% baseline. The canonical policy records that value as an
observation only. It is not an immutable policy decision, and the platform MUST
NOT encode a replacement rate.

Any rate or allocation change belongs to protocol governance in
`Conxian/Conxian`. In particular, the alternative schedule in
[protocol issue #488](https://github.com/Conxian/Conxian/issues/488) is not
adopted by this change.

The normative requirements below describe the acceptance boundary for a
fee-bearing flow. They do not claim that the current upstream contract already
enforces every requirement. Gaps are tracked by the protocol handoff issue
[Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538), including
the no-op paths identified in [protocol issue #469](https://github.com/Conxian/Conxian/issues/469).

## 3. Fee-bearing flow registration

The platform does not invent concrete fee-bearing flows. Before a flow can be
enabled for routed operations, the protocol repository MUST register a stable
flow definition containing:

- `flowId`: unique, versioned identifier;
- `feeBase`: the integer quantity from which the fee is calculated and its
  units;
- `asset`: the exact asset/contract identity and decimal rules;
- `collectorOrDistributor`: the protocol-authoritative destination;
- `trigger`: the protocol event or state transition that makes the fee due;
- `authorizedCallers`: permitted principals or caller classes; and
- `replayKey`: deterministic key used for exactly-once evaluation.

Registration is a prerequisite for activation. An incomplete or ambiguous
definition MUST remain disabled and MUST fail closed at the platform boundary.

## 4. Execution invariants

For each registered flow, the protocol implementation and its tests must make
the following behavior explicit:

1. **Exactly once**: a replay key can produce at most one successful fee
   application. A retry with the same key and identical flow inputs MAY return
   the original result, but MUST NOT transfer or account for the fee again. A
   replay with conflicting inputs MUST fail deterministically without a partial
   transfer.
2. **Integer arithmetic**: fee calculations MUST use integer quantities and an
   explicitly versioned denominator/rate representation. Rounding direction
   MUST be deterministic and documented; floating-point arithmetic is not
   permitted.
3. **Zero fee**: when deterministic rounding produces zero, the implementation
   MUST make no zero-value transfer, MUST record a distinguishable zero-fee
   outcome, and MUST not report the amount as collected.
4. **Authorization**: only registered authorized callers may trigger a flow.
   Principal checks MUST bind the caller, payer, asset, and collector rules to
   the registered flow; arbitrary caller-supplied destinations MUST NOT replace
   the protocol-authoritative collector/distributor.
5. **Pause and fail-closed**: a paused flow, missing registration, invalid
   principal, unavailable dependency, or unverifiable protocol result MUST
   reject the operation. The platform MAY disable payout operations with its
   feature flag, but disabling the flag MUST NOT be treated as successful fee
   collection.
6. **Atomic effects**: accounting updates and token transfers MUST be atomic or
   provide an equivalent rollback guarantee. A failed transfer MUST NOT produce
   a successful collection event or an advanced replay record.
7. **Events and auditability**: successful, zero-fee, replay, and failure
   outcomes MUST expose stable audit fields sufficient to correlate at least the
   flow ID, replay key, asset, fee base, fee amount, payer, caller,
   collector/distributor, policy/version identifier, outcome, and protocol
   transaction/block reference when available.
8. **Failure semantics**: validation, authorization, paused, replay-conflict,
   dependency, and transfer failures MUST have deterministic classifications.
   Retry behavior MUST be explicit: only safe retries may reuse a replay key,
   and failures MUST NOT create partial accounting or transfer effects.

## 5. Platform and Gateway behavior

The platform and Gateway:

- MUST route using protocol-authoritative flow definitions, fee outputs, and
  settlement results;
- MUST NOT calculate or persist a conflicting canonical fee;
- MUST NOT claim custody of the payer asset, fee, or collector balance;
- MUST preserve protocol error/failure outcomes rather than converting them to
  success; and
- MAY disable platform payout operations through `BOUNTY_PAYOUT_ACTIVE` or an
  equivalent operational control when a protocol or routing safety condition is
  not satisfied.

Disabling a platform operation is an operational control only. It does not
pause or mutate protocol state unless an explicitly authorized protocol control
path is invoked by the protocol owner.

## 6. Known upstream follow-up

The handoff does not claim hardening is complete. Protocol maintainers must
resolve or explicitly disposition:

- coverage of all fee-bearing triggers and registered flows;
- exactly-once and replay-conflict behavior;
- caller authorization and principal relationships;
- pause/fail-closed behavior;
- atomic accounting and token transfers;
- event and audit-field completeness;
- integer rounding and zero-fee semantics;
- the treasury README `initialize` documentation/interface mismatch; and
- no-op `collect-protocol-fees` paths identified in protocol issue #469.

These items are owned by [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538),
not by a Clarity implementation in `conxius-platform`.
