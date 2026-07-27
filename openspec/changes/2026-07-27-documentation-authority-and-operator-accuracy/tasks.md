# Tasks: Documentation Authority and Operator Accuracy Alignment

Refs #1201

Deferred coordination: #1167

## Proposal phase

- [x] Read the onboarding contract, governance baseline, information hierarchy,
  and current `spec-driven` OpenSpec convention.
- [x] Record the authority-preserving scope, explicit non-goals, implementation
  design, and testable capability requirements.
- [x] Keep this phase limited to the change-local OpenSpec artifacts.

## Implementation inventory

- [ ] Enumerate broken relative links in active mutable documentation and
  active OpenSpec artifacts, excluding historical/archive paths.
- [ ] Record each stale present-tense operator/deployment statement with its
  repository evidence and intended current/external/target classification.
- [ ] Identify published evidence documents without rewriting them; route any
  correction through an allowed dated addendum or active authority/operational
  document.

## Documentation corrections

- [ ] Repair the in-scope relative links without editing archived historical
  artifacts.
- [ ] Correct direct Admin Dashboard, Compose Admin Dashboard, Grafana, Gateway,
  and UI port/surface guidance.
- [ ] Describe Compose as a local control-plane/integration harness and label
  default Gateway/UI images plus optional Bisq/RGB/BitVM services as
  placeholders/stubs.
- [ ] Document the exact behavior and limitations of `make auth` and
  `scripts/provision-secrets.sh` without changing key-generation policy.
- [ ] Replace invalid package command examples with commands backed by current
  package scripts.
- [ ] Correct demonstrably stale facts in active authority/operational docs,
  preserving existing tier assignments and deferring authority selection to
  #1167.
- [ ] Separate current local, external, and target/proposed deployment surfaces;
  remove nonexistent paths and unsupported production/Kubernetes/GitOps/NixOS
  claims while preserving the routing-only/fail-closed boundary.
- [ ] Add `Last verified: YYYY-MM-DD` only to relevant changed operational docs
  that contain time-sensitive status or operator instructions.

## Markdown link validation

- [ ] Add the deterministic local Markdown-link validator with explicit active
  path and archive exclusions.
- [ ] Add focused tests for local paths, reference links, images, encoded paths,
  fragments, exclusions, external URLs, and failure diagnostics.
- [ ] Add the root `check:markdown-links` package command (or equivalently named
  documented command).
- [ ] Add a pinned, documentation-aware CI validation path that runs for
  Markdown/OpenSpec and validator changes without requiring secrets or network
  crawling.

## Validation and handoff

- [ ] Run the targeted Markdown-link command and its focused tests.
- [ ] Run relevant root/workspace package validation for every changed script
  or manifest.
- [ ] Run strict OpenSpec validation for this change.
- [ ] Run `git diff --check` and verify no archived/historical artifact was
  modified.
- [ ] Verify no documentation statement claims production readiness, custody,
  settlement success, or implemented deployment infrastructure without
  evidence.
- [ ] Append one dated implementation session-log entry to `AGENTS.md` without
  modifying prior entries.
