# Conxius Platform Deployment Surfaces

**Status:** Local/reference orchestration only; no supported production deployment is supplied by this repository.

**Last verified:** 2026-07-27

**Authority:** [`PRODUCTION_BOUNDARY.md`](./PRODUCTION_BOUNDARY.md). Current
alignment change:
[`2026-07-27-documentation-authority-and-operator-accuracy`](../openspec/changes/2026-07-27-documentation-authority-and-operator-accuracy/).

This document separates executable local paths from external-owner handoffs and
target architecture. It does not certify production readiness.

## Current local surfaces

The supported repository-local paths are:

1. Direct package development, including the Admin Dashboard on
   `http://localhost:3001` by default.
2. The Docker Compose control-plane/integration harness, where the Admin
   Dashboard is `http://localhost:3002`, Grafana is
   `http://localhost:3001`, and Prometheus is `http://localhost:9090`.
3. Local environment preparation through `make auth`, subject to the exact
   generation limits documented in [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md#what-make-auth-does).

Use [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md) for commands, ports,
placeholder images, RPC-stub profiles, and secret-provisioning limits.

Compose is not a full protocol or production stack. The default Gateway and UI
images are placeholders, optional Bisq/RGB/BitVM profiles are RPC stubs, and an
unavailable dependency must remain unavailable rather than be reported as a
successful route or settlement.

## External-owner handoffs

Production implementations and deployment artifacts for the Gateway, Conxian
UI, protocol contracts, wallet, Nexus, enclave SDK, and Orbit belong to their
own repositories or an operator-supplied environment. This repository can
compose externally supplied images and endpoints, but it does not contain
supported in-repo Kubernetes manifests, GKE/GCP deployment automation, an
ArgoCD application, or a Render blueprint for those services.

`make deploy` is a legacy convenience target. If the external
`conxius-orbit` command is installed, it invokes `conxius-orbit deploy --all`.
Otherwise it only prints fallback messages; the absent legacy GCP/Render paths
are unsupported, and the target does not deploy Gateway to GCP or UI to Render.
Treat deployment execution and evidence as owned by the external
operator/repository, not guaranteed by this target.

## Target/proposed architecture

`flake.nix`, NixOS, sops-nix, Kubernetes, GitOps, ArgoCD, GCP, and Render may
appear in architecture or roadmap documents as target/proposed designs. This
repository does not currently provide a supported node configuration or
production promotion path for those targets. Do not run guessed
`nixos-rebuild`, Kubernetes, or cloud commands from roadmap prose.

Selecting and implementing a production deployment platform requires a
separate approved OpenSpec change, owner review, secret-management design,
rollback evidence, and fail-closed acceptance criteria.

## Safety boundary

`conxius-platform` is a routing/control-plane layer. It does not take custody,
hold signing keys for users, execute trades, or convert placeholder/stub
responses into authoritative protocol state. Production verifier, observation,
settlement, and key-release dependencies remain unavailable unless independently
implemented and accepted at their owning boundary.

The unresolved Protocol/Nexus/Gateway/Platform authority coordination is
deferred to issue [#1167](https://github.com/Conxian/conxius-platform/issues/1167);
this deployment guide does not choose an owner.
