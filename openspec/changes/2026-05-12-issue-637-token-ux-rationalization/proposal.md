# OpenSpec Proposal: Multi-Token UX Rationalization for Retail Users

Refs #637

## Problem statement
Current multi-token behavior is difficult for retail users to understand, especially in Global South contexts where low-friction comprehension and predictable transaction outcomes are critical.

## Proposed scope

### 1) Canonical user-facing token model
Define approved token roles and user-safe abstractions:
- explicit token purpose per user intent (store, spend, route, rewards, settlement)
- simplified presentation layer that hides protocol complexity by default
- guardrails for terminology consistency across product surfaces

### 2) UX flows and copy alignment
Update onboarding, transaction, and balance interpretation flows so they align to the canonical model:
- onboarding education checkpoints
- send/receive and conversion flow language
- balance views that clarify available vs pending vs routed value

### 3) Migration compatibility notes
Document migration behavior for existing wallets/accounts:
- backward compatibility and fallback handling
- edge cases (legacy balances, partial migrations, stale client versions)
- operator support notes for incident handling

### 4) Success metrics + instrumentation
Define measurable outcomes and instrumentation requirements for:
- task completion rate
- comprehension score / user confidence proxies
- user error-rate reduction
- support ticket volume related to token confusion

## Acceptance criteria mapping
| Issue acceptance criterion | Proposal commitment |
| --- | --- |
| Canonical token model approval | Normative token role model + abstraction rules |
| UX flow/copy updates | Flow and content requirements mapped to onboarding/transacting/balance interpretation |
| Migration compatibility notes | Backward compatibility + edge case handling for existing wallets/accounts |
| Measurable success metrics | Defined KPI set and instrumentation expectations |

## Dependencies and sequencing
- Final UX flow commitments should follow #635 and #636 interface stabilization.
- Discovery and prototype UX research can proceed before dependency closure.
