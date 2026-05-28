# Repo ownership

## Purpose

`conxius-platform` is the composition, runtime, and integration harness repo for the Conxian builder platform.

## This repo owns

- local ecosystem composition
- integration harnesses
- runtime wiring
- observability and validation environments
- orchestrated developer workflows across strategic repos

## This repo does not own

- canonical shared-core logic
- canonical adapter implementations
- wallet UX ownership
- portfolio-wide strategy ownership

## Boundary rule

This repo should compose strategic repos rather than become the hidden home of business logic that belongs in `lib-conxian-core`, `conxian-gateway`, or `conxius-enclave-sdk`.

## Lifecycle/control gate ownership

- **Gate owner of record:** `@conxian/core-devs`
- **Accountable surfaces:** lifecycle/control CI gates, verification evidence standards, release/operate readiness controls.
- **Escalation:** if lifecycle/control gates fail for release-bound work, escalate in the active PR/issue to `@conxian/core-devs` and block promotion until resolution or documented rollback.

## Strategic role

Primary strategic repo, with a composition/runtime scope.
