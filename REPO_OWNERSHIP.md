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

## Strategic role

Primary strategic repo, with a composition/runtime scope.