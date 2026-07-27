# Documentation Authority and Operator Accuracy

## ADDED Requirements

### Requirement: Documentation corrections preserve authority and history

The documentation alignment SHALL correct active mutable documents according to
the repository's governance and information hierarchy. It SHALL NOT change
document tier assignments, select Protocol/Nexus/Gateway/Platform authority,
rewrite published evidence or historical session entries, or edit archived
historical artifacts merely to repair old content. Authority selection SHALL
remain deferred to issue #1167.

#### Scenario: Active statement conflicts with repository evidence

- **WHEN** an active governance, canonical, or operational document makes a
  present-tense claim contradicted by tracked configuration or an executable
  repository command
- **THEN** the mutable active statement is corrected or explicitly labeled
  unknown, external, target, proposed, or deferred
- **AND** the correction records a verifiable evidence source
- **AND** no authority or tier decision is introduced implicitly

#### Scenario: Defect occurs in historical or immutable material

- **WHEN** a broken link or stale statement exists only in an archived artifact,
  immutable evidence record, or prior session-log entry
- **THEN** that historical content remains unchanged
- **AND** any necessary current correction is made through an allowed active
  document or dated addendum

### Requirement: Local operator guidance matches executable repository surfaces

Local development documentation SHALL distinguish direct service execution
from Docker Compose host mappings, describe Compose as a local
control-plane/integration harness, label placeholder images and RPC stubs, state
the verified limitations of `make auth`, and use commands backed by current
package scripts.

#### Scenario: Operator starts the Admin Dashboard directly

- **WHEN** an operator follows the direct Admin Dashboard development guidance
- **THEN** the documented default URL is `http://localhost:3001` unless `PORT`
  is overridden
- **AND** the guidance does not confuse that process with Compose Grafana or the
  Compose Admin Dashboard mapping

#### Scenario: Operator uses Docker Compose

- **WHEN** an operator follows the Compose guidance
- **THEN** the Admin Dashboard host URL is documented as
  `http://localhost:3002` mapped to container port `3001`
- **AND** Grafana's host port `3001` is identified separately
- **AND** default Gateway/UI images and optional Bisq/RGB/BitVM services are
  labeled placeholders or stubs rather than production implementations

#### Scenario: Operator runs authentication provisioning guidance

- **WHEN** an operator evaluates or runs `make auth`
- **THEN** documentation lists the supported schema copy, generated fields,
  Postgres/Grafana checks, and Prometheus scrape-password behavior
- **AND** it states that the command does not fetch every service/third-party or
  production credential and does not establish production readiness

### Requirement: Deployment documentation separates current, external, and target state

Active deployment documentation SHALL identify whether each described surface
is current local functionality, externally owned/operator supplied, or a
target/proposed architecture. Nonexistent local paths and unsupported claims of
implemented Kubernetes, GitOps, NixOS, cloud, or production deployment SHALL be
removed or relabeled. The routing-only and fail-closed production boundary SHALL
remain explicit.

#### Scenario: Target architecture has no supported local implementation

- **WHEN** a document describes a NixOS, Kubernetes, GitOps, cloud, or other
  production-oriented design that is not implemented as a supported path in
  this repository
- **THEN** the design is labeled target/proposed or external
- **AND** nonexistent local paths are not presented as commands or artifacts
- **AND** unavailability is not converted into a readiness or success claim

#### Scenario: External dependency is unavailable

- **WHEN** Gateway, UI, protocol-node, settlement, or deployment capability is
  represented only by an external dependency, placeholder, stub, or roadmap
- **THEN** documentation states that limitation
- **AND** does not claim custody, signing, trade execution, settlement success,
  production availability, or production deployment

### Requirement: Relevant operational status carries minimal freshness metadata

An operational document changed because it communicates time-sensitive status
or operator instructions SHALL include a single `Last verified: YYYY-MM-DD`
line, unless it already has an equivalent stronger freshness marker. The date
SHALL describe the verified portion and SHALL NOT be represented as a blanket
certification.

#### Scenario: Time-sensitive operational guidance is corrected

- **WHEN** implementation evidence is used to update a current port, command,
  deployment status, placeholder boundary, or operator procedure
- **THEN** the operational document records the date on which that guidance was
  verified
- **AND** canonical, evidence, historical, and timeless documents are not given
  freshness metadata solely for cosmetic consistency

### Requirement: Active local Markdown links are validated deterministically

The repository SHALL preserve and extend the canonical local, deterministic
Python Markdown-link validator established by PRs #1202/#1203 for
in-scope active documentation and active OpenSpec artifacts. It SHALL validate
relative files, directories, images, reference-style destinations, and local
fragments without making network requests. It SHALL exclude archived/historical
paths according to an explicit policy and SHALL return actionable non-zero
failures for broken in-scope targets.

The validator SHALL recognize GitHub-style ATX and Setext headings,
deterministic duplicate suffixes, explicit HTML `id` and `a[name]` anchors,
same-file and cross-file fragments, encoded paths/fragments, directory README
anchors, normalized reference forms, and supported nested/escaped inline
destinations. It SHALL ignore code lookalikes and generic external URI schemes,
and SHALL preserve lexical plus realpath containment checks.

#### Scenario: Active document contains a broken relative target

- **WHEN** an in-scope active Markdown file references a missing local path or
  missing local anchor
- **THEN** the validator exits non-zero
- **AND** reports the source, destination, and failure reason

#### Scenario: Link is external or historical

- **WHEN** a link uses a network-only scheme or the source document is under an
  explicitly excluded historical/archive path
- **THEN** the validator makes no network request
- **AND** the historical source is not added to the active repair gate

#### Scenario: Documentation-only change enters CI

- **WHEN** a pull request changes in-scope Markdown, OpenSpec artifacts, the
  validator, its tests, or workflow
- **THEN** a pinned documentation-aware CI path runs the local validator
- **AND** it requires no production secret or external URL availability
- **AND** it retains the merged timeout, least-permission, and reusable
  secret-scan behavior

### Requirement: Session history is appended only during implementation

The proposal-only phase SHALL modify only the change-local OpenSpec artifacts.
The later implementation phase SHALL append exactly one dated session-log entry
for this work and SHALL NOT rewrite earlier entries.

#### Scenario: Proposal is committed before corrections

- **WHEN** the OpenSpec proposal branch is reviewed before implementation
- **THEN** no documentation correction, validator, workflow, package script, or
  session-log edit is present outside this change directory

#### Scenario: Implementation is completed later

- **WHEN** the approved documentation alignment implementation is finalized
- **THEN** one new dated session-log entry summarizes the implementation
- **AND** prior historical session entries remain byte-for-byte unchanged
