# Spec Delta: Deterministic Swarm Coordination Protocol v1

The current `spec-driven` OpenSpec delta is the capability specification at:

`openspec/changes/2026-07-22-issue-1163-swarm-coordination/specs/swarm-coordination/spec.md`

That file contains one requirement and scenario for each issue-level criterion
AC-1 through AC-5 and is the artifact consumed by the strict OpenSpec
validator. The exact capability name is `swarm-coordination`.

The detailed normative contract remains the existing canonical specification:

`openspec/specs/swarm-coordination-v1.spec.md`

The change-local capability file intentionally points to that canonical source
instead of reproducing its envelope, graph, aggregation, handover, context,
serialization, and security requirements. This legacy-named file is retained
as a reader-facing index for repositories and tooling that still link to
`spec-delta.md`; it is not a second normative contract.

## Acceptance mapping

| Issue criterion | Change-local requirement | Canonical contract |
| --- | --- | --- |
| AC-1 — Inter-agent communication protocols | `AC-1 — Transport-neutral envelope and lifecycle validation` | Canonical Section 5 |
| AC-2 — Task decomposition patterns | `AC-2 — Deterministic task decomposition and capability matching` | Canonical Section 6 |
| AC-3 — Result aggregation mechanisms | `AC-3 — Deterministic result aggregation and conflict evidence` | Canonical Section 7 |
| AC-4 — Agent-to-agent handover format | `AC-4 — Graph-linked machine-readable handover` | Canonical Section 8 |
| AC-5 — Session context sharing | `AC-5 — Allowlisted, bounded, and precedence-aware context sharing` | Canonical Section 9 |

## Dependency and compatibility notes

- Issue #1163 consumes the merged #1162 discovery protocol for repository root,
  declared context, inert skills, attestation, and trusted-anchor boundaries;
  it does not modify or execute #1162 artifacts.
- Existing onboarding and continuity documentation links the canonical spec and
  remains compatible with this change-local OpenSpec layout.
- Implementations that cannot validate a required version, mandatory field,
  digest, provenance boundary, or context rule must reject rather than silently
  downgrade.

## Implemented surface

The implementation remains concentrated in `scripts/agent-coordination.ts`
and `scripts/agent-discovery-contract.ts`, with discovery production in
`scripts/agent-discovery.ts`, tests in `scripts/agent-coordination.test.ts` and
`scripts/agent-discovery.test.ts`, machine-readable schemas in
`schemas/agent-swarm.schema.json` and `schemas/agent-discovery-trust.schema.json`,
and links from `docs/AGENT_ONBOARDING.md` and `docs/SESSION_CONTINUITY.md`.
