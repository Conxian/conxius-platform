# Specification: Revenue Automation Policy and Protocol Handoff

**Status**: Canonical platform boundary specification
**Date**: 2026-07-22
**Platform issue**: [Conxian/conxius-platform#1164](https://github.com/Conxian/conxius-platform/issues/1164)
**Alignment issue**: [Conxian/conxius-platform#1167](https://github.com/Conxian/conxius-platform/issues/1167)
**Protocol handoff**: [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538)

## 1. Purpose and normative language

This specification defines the ownership boundary and operational acceptance
requirements for protocol revenue automation as consumed by
`conxius-platform`. It is a platform policy and routing contract; it is not a
Clarity implementation.

The terms **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative.

## 2. Ownership and boundary

### 2.1 Protocol repository ownership

`Conxian/Conxian` owns:

- Clarity contract source, semantics, and protocol tests;
- deployment manifests, deployment policy, and release evidence;
- registration and semantics of fee-bearing protocol flows;
- canonical on-chain contract state and contract-generated fee outcomes,
  including fee calculations, accounting, transfers, and events; and
- economic policy, including any fee-rate or allocation change approved through
  protocol governance.

The protocol repository is canonical for deployed Clarity semantics, canonical
on-chain contract state, and contract-generated outcomes. It does not replace the
Conxian Gateway as the platform-facing authority for observed protocol state or
routing/business logic.

### 2.2 Platform repository ownership

`conxius-platform` owns only:

- operational routing through the Conxian Gateway of observed protocol state,
  registered flow metadata, and contract-generated outputs;
- feature flags and operator runbooks;
- observability and reporting of protocol/routing outcomes; and
- the ability to disable platform payout operations when a safety condition is
  not satisfied.

The Conxian Gateway remains the platform-facing authoritative interface/source
for observed protocol state and routing/business logic. Gateway MUST derive and
report fee outcomes from canonical on-chain contract state and registered flow
metadata. Gateway MUST NOT invent a conflicting fee calculation, override a
protocol-owned collector/distributor, or claim custody.

The platform MUST NOT:

- add, deploy, or modify a local or upstream Clarity contract;
- calculate or persist a competing canonical fee;
- substitute a platform-selected collector/distributor for the protocol
  destination; or
- claim custody of user, protocol, or payout assets.

## 3. Current observed baseline and governance

The upstream contract
[`contracts/treasury/revenue-automation.clar`](https://github.com/Conxian/Conxian/blob/main/contracts/treasury/revenue-automation.clar)
exists in `Conxian/Conxian`, is registered in `Clarinet.toml` and the mainnet
manifest, and currently contains an observed `PROTOCOL_FEE_BPS u100` baseline:
100 basis points / 1%.

This is a **current implementation observation**, not an immutable policy
decision and not a claim that all fee paths are hardened. The platform MUST
not adopt or imply another rate. Any fee-rate or allocation change MUST be
proposed, reviewed, and approved through protocol governance in
`Conxian/Conxian`. The alternative schedule described in
[protocol issue #488](https://github.com/Conxian/Conxian/issues/488) is not
adopted by this specification.

Known implementation and integration gaps remain tracked in
[Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538), including
the no-op fee paths identified in [protocol issue #469](https://github.com/Conxian/Conxian/issues/469).

## 4. Fee-bearing flow registration

The platform MUST NOT invent or activate a new concrete fee-bearing flow. A
protocol-owned flow MUST be registered before it is exposed to platform routing
or payout operations.

Each registered flow MUST define all of the following:

| Field | Requirement |
|---|---|
| `flowId` | Stable, versioned identifier for the fee-bearing flow. |
| `feeBase` | Integer quantity from which the fee is calculated, including units. |
| `asset` | Exact asset/contract identity and applicable integer decimal rules. |
| `collectorOrDistributor` | Protocol-owned destination recorded in the registered flow. |
| `trigger` | Protocol event or state transition that makes the fee due. |
| `authorizedCallers` | Permitted principals or caller classes. |
| `replayKey` | Deterministic key used to enforce exactly-once behavior. |

An incomplete, ambiguous, paused, or unverifiable registration MUST remain
disabled and MUST fail closed at the platform boundary.

## 5. Execution requirements

### 5.1 Exactly-once and replay

For each registered flow, a replay key MUST produce at most one successful fee
application.

- A retry with the same replay key and identical registered inputs MAY return
  the original result, but MUST NOT transfer or account for the fee again.
- A replay with conflicting inputs MUST fail deterministically and MUST NOT
  create a partial transfer, accounting update, or success event.
- The replay record MUST advance only with the corresponding successful atomic
  outcome, or with an explicitly defined terminal failure state that cannot be
  mistaken for collection.

### 5.2 Deterministic integer rounding

Fee calculation MUST use integer quantities and an explicitly versioned integer
rate/denominator representation. Implementations MUST document the rounding
direction and apply it consistently for identical inputs. Floating-point
arithmetic MUST NOT affect the fee amount.

This specification does not set a new rate or denominator; those are protocol
policy inputs owned by governance.

### 5.3 Zero-fee behavior

When deterministic integer rounding produces a zero fee:

- no zero-value token transfer MUST be attempted;
- the result MUST be distinguishable as `zero_fee` (or an equivalent stable
  protocol outcome);
- the amount MUST NOT be reported as collected; and
- the outcome MUST remain auditable with the flow, replay key, base amount, and
  asset.

### 5.4 Authorization and principals

Only callers listed by the registered flow may trigger fee automation. Principal
checks MUST bind the caller, payer, asset, and collector/distributor to the
registered flow. A caller MUST NOT provide an arbitrary destination that
overrides the registered protocol-owned collector/distributor.

Unauthorized callers, invalid principal relationships, unsupported assets, and
malformed flow inputs MUST fail without partial accounting or transfer effects.

### 5.5 Pause and fail-closed behavior

A paused flow MUST reject fee application. The following conditions MUST fail
closed rather than produce a successful collection result:

- missing, incomplete, or unverifiable flow registration;
- invalid caller, payer, asset, or collector principal;
- unavailable or inconsistent protocol dependency;
- replay-key conflict;
- failed token transfer or accounting update; and
- a platform safety flag that disables payout operations.

The platform MAY disable payout operations with `BOUNTY_PAYOUT_ACTIVE` or an
equivalent operational control. That control is not protocol custody and MUST
not be represented as successful fee collection.

### 5.6 Atomic accounting and transfers

Accounting updates and token transfers MUST be atomic or provide an equivalent
rollback guarantee. A failed transfer MUST NOT result in:

- a successful collection response;
- an advanced successful replay record;
- a successful collection event; or
- an accounting balance that claims the fee was received.

The protocol implementation MUST define the failure result and preserve enough
state to retry safely under the replay rules.

### 5.7 Events and audit fields

Successful, zero-fee, replay, and failure outcomes MUST expose stable audit
fields sufficient to correlate:

- `flowId` and flow/policy version;
- `replayKey`;
- asset identity;
- fee base and calculated fee amount;
- payer and authorized caller;
- collector/distributor;
- outcome and deterministic failure class; and
- protocol transaction/block reference when available.

Events MUST NOT be treated as proof of transfer unless the corresponding atomic
accounting/transfer outcome succeeded.

### 5.8 Failure semantics

Implementations MUST classify at least validation, authorization, paused,
replay-conflict, dependency, and transfer failures deterministically. Retry
behavior MUST be explicit. Only an identical, safe retry may reuse a replay
key; a conflicting retry MUST fail closed.

The platform and Gateway MUST preserve protocol failure outcomes and MUST NOT
convert a rejected, paused, or unverified operation into success.

## 6. Platform/Gateway routing contract

The platform and Gateway MUST route using registered flow metadata, canonical
on-chain contract state, and contract-generated fee/settlement outcomes as
observed through Gateway. They MUST NOT calculate a conflicting canonical fee,
maintain a shadow fee ledger that disagrees with the protocol, or claim custody
of the asset or fee.

If protocol output is missing, stale, inconsistent, or unavailable, the
platform MUST fail closed or disable the affected payout operation. Operators
MUST use the runbook controls and Gateway operations described in
[`MAINTAINER_BOUNTY_RUNBOOK.md`](../../docs/runbooks/MAINTAINER_BOUNTY_RUNBOOK.md);
they MUST NOT deploy or modify the Clarity contract from this repository.

## 7. Known upstream gaps and status boundary

This specification is normative for the platform boundary; it does not claim
that the current upstream contract already enforces every requirement in
Sections 4–6. Protocol maintainers must track implementation, tests, audit
evidence, and deployment-policy decisions in
[Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538), including:

- complete trigger/flow coverage;
- exactly-once and replay-conflict semantics;
- caller authorization and principal rules;
- pause/fail-closed behavior;
- atomic accounting and token transfers;
- event/audit-field completeness;
- deterministic rounding and zero-fee behavior;
- the treasury README `initialize` documentation/interface mismatch; and
- no-op `collect-protocol-fees` paths described in [protocol issue #469](https://github.com/Conxian/Conxian/issues/469).

## 8. Acceptance scenarios

### Scenario 1: Registered flow can be routed

- **Given** a protocol-owned flow has a complete versioned registration with fee
  base, asset, collector/distributor, trigger, authorized callers, and replay
  key definition.
- **When** the Gateway receives a contract-generated fee output derived from
  canonical on-chain contract state and registered flow metadata, and the
  platform payout flag is enabled.
- **Then** the platform routes the output without recalculating a competing
  fee, without changing the collector, and without claiming custody.

### Scenario 2: Incomplete registration fails closed

- **Given** a fee-bearing flow is missing a required registration field or has
  an unverifiable protocol result.
- **When** an operator attempts to enable or route the flow.
- **Then** the platform rejects or disables the operation and does not report
  fee collection success.

### Scenario 3: Identical retry is exactly once

- **Given** a flow has already succeeded for replay key `K` with registered
  inputs `I`.
- **When** the same operation with replay key `K` and identical inputs `I` is
  retried.
- **Then** the protocol MAY return the original result, but it MUST NOT perform
  a second transfer or accounting update.

### Scenario 4: Conflicting replay fails

- **Given** replay key `K` has a recorded successful outcome for inputs `I`.
- **When** a caller retries `K` with conflicting inputs `I2`.
- **Then** the operation fails with a deterministic replay-conflict outcome and
  no partial transfer, accounting update, or success event is created.

### Scenario 5: Zero-fee rounding is explicit

- **Given** a registered flow's deterministic integer calculation rounds the fee
  to zero.
- **When** the fee-bearing trigger executes.
- **Then** no zero-value transfer occurs, the result is recorded as `zero_fee`
  (or an equivalent stable outcome), and the amount is not reported as
  collected.

### Scenario 6: Unauthorized caller fails closed

- **Given** a caller principal is not authorized by the registered flow.
- **When** it attempts to trigger fee automation.
- **Then** the operation is rejected without accounting or transfer effects and
  the failure is auditable as an authorization failure.

### Scenario 7: Pause or platform disablement blocks payout

- **Given** the protocol flow is paused, or `BOUNTY_PAYOUT_ACTIVE=false` disables
  the platform payout operation.
- **When** a payout route is requested.
- **Then** the operation fails closed, no successful collection is claimed, and
  the operator can identify the disabled/paused outcome.

### Scenario 8: Transfer failure is not success

- **Given** a registered flow calculates a non-zero fee but the token transfer
  or atomic accounting step fails.
- **When** the protocol execution completes.
- **Then** the operation returns a deterministic failure, does not advance a
  successful replay record, and does not emit a successful collection event.

## 9. Explicit non-goals

- No platform-local Clarity contract.
- No Clarity implementation, test, or deployment change in
  `conxius-platform`.
- No fee-rate or allocation change.
- No platform custody, shadow canonical fee ledger, or protocol economic-policy
  decision.
