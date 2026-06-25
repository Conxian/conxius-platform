# Tasks: Repo-by-Repo Production Artifact Contracts

## Implementation checklist

- [x] Define artifact types for `conxius-platform`, `admin-dashboard`, and `conxian-gateway`.
- [x] Document install verification paths and rollback expectations.
- [x] Align `FULL_STACK_BITCOIN_RESEARCH.md` with artifact-specific requirements (Wasm-First, Native-Rust).
- [ ] Add checksum verification scripts to `conxius-orbit` (legacy: Conxius Orbit).
- [ ] Implement automated artifact integrity checks in `reusable-ci.yml`.

## Acceptance criteria (testable)

- [x] **AC-1 (Explicit Mapping):** Documentation defines how each repo is packaged and verified.
- [x] **AC-2 (Alignment):** Research documents reflect the shift to Wasm-First execution for client-side portability.
