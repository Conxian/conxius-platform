# Documentation Authority and Operator Accuracy Alignment

Refs #1201

Deferred coordination: #1167

## Why

Align active documentation with the repository state that operators and
contributors can verify, while preserving the governance baseline, the
information hierarchy, and the routing-only/fail-closed production boundary.

The issue #1201 audit identified active documentation that can misdirect an
operator because relative links no longer resolve, local ports are described
without distinguishing direct execution from Docker Compose, placeholder
services are presented too strongly, commands do not match current package
scripts, and target deployment designs are sometimes written as current local
or production surfaces.

These are documentation defects, not evidence that the platform is production
ready. Correcting them requires an authority-aware change so that current facts
are repaired without rewriting immutable history, silently changing document
tiers, or deciding unresolved cross-repository authority.

## What Changes

- Repair broken relative links in active, mutable documentation and active
  OpenSpec changes. Do not edit archived OpenSpec changes or historical
  documentation.
- Make local development guidance distinguish the Admin Dashboard's direct
  default (`localhost:3001`) from the Compose host mapping
  (`localhost:3002` -> container port `3001`).
- Describe Docker Compose as a local control-plane/integration harness. Its
  default Gateway and Conxian UI images are placeholders unless operators
  provide real images, and its optional Bisq, RGB, and BitVM profiles are RPC
  stubs rather than production protocol nodes.
- Document the exact limits of `make auth`: it copies the selected schema when
  needed, generates only the supported local secret fields, creates/validates
  the Prometheus scrape-password file, checks selected Postgres/Grafana values,
  and does not retrieve every required credential or establish production
  authentication.
- Replace invalid command examples with commands backed by current root or
  workspace package scripts.
- Correct demonstrably stale present-tense facts in active governance,
  canonical, and operational documents using repository evidence, without
  rewriting immutable evidence or historical session entries.
- Separate current local surfaces from target/external deployment surfaces;
  remove nonexistent local paths and unsupported claims that this repository
  currently supplies a Kubernetes, GitOps, NixOS, or production deployment.
- Add minimal freshness metadata to the operational documents whose current
  status or operator instructions are verified by this change.
- Add a deterministic local Markdown-link validator and wire it to a root
  package command and a CI path that runs for documentation/OpenSpec changes.
- Append the required `AGENTS.md` session-log entry only in the later
  implementation phase.

## Non-goals

- Selecting or changing Protocol, Nexus, Gateway, or Platform authority. That
  decision remains coordinated through issue #1167.
- Reclassifying documents among canonical, operational, evidence, or historical
  tiers without an owner decision.
- Selecting a production deployment platform or implementing NixOS,
  Kubernetes, GitOps, or other production infrastructure.
- Changing M2M key-generation policy, secret provisioning behavior, runtime
  behavior, service images, Compose topology, or ports.
- Editing archived/historical documents merely to repair old links, or
  rewriting immutable evidence and historical session entries.
- Making a production-readiness, custody, settlement, protocol-node, or
  deployment-completeness claim.

## Acceptance summary

1. Every changed current-state statement is traceable to a repository file,
   executable command, package manifest, or explicitly identified external
   owner; target state is labeled as target/external.
2. Active local relative links pass the new deterministic validator, while
   historical/archive paths remain excluded from repair.
3. Local operator guidance identifies the correct direct/Compose ports,
   placeholder and stub boundaries, `make auth` limits, and valid package
   commands.
4. Production guidance remains fail closed: absence of an implemented local
   deployment surface is never converted into an availability or readiness
   claim.
5. The implementation diff preserves tier assignments and defers the authority
   decision to #1167.

## Risk

- A broad documentation sweep could accidentally rewrite historical evidence
  or turn a target architecture into a present-tense promise. The design uses
  explicit path exclusions, evidence references, and current/target labels.
- A link checker could produce unstable results if it depends on the network.
  The validator is local and deterministic; external URLs are not treated as
  locally verifiable targets.
- CI wiring could miss documentation-only changes because current general CI
  paths ignore Markdown. The implementation must provide a documentation-aware
  trigger rather than relying on an ignored path.
