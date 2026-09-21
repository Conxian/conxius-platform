# Full Conxian Platform upgrade and reframing

## Why

The repository has matured beyond a control-plane description, but its public language and machine-readable catalog do not yet describe the full platform spine it owns. This change aligns the implementation and documentation around composition, lifecycle, deployment intent, verification, telemetry, service catalog, and operator experience while preserving authority boundaries.

## Scope

- Add a versioned platform manifest and JSON Schema.
- Link the manifest from the service catalog.
- Reframe dashboard and repository language from control plane to Conxian Platform.
- Preserve fail-closed evidence and external ownership boundaries.
- Do not absorb Gateway, Nexus, protocol, wallet, custody, signing, or business authority.

## Acceptance criteria

- The manifest declares owned and external capabilities, lifecycle stages, Bitcoin-native posture, and fail-closed evidence policy.
- The service catalog references the manifest.
- Public/operator copy names the Conxian Platform without claiming external execution ownership.
- Existing tests, typechecks, builds, and readiness checks remain valid.
