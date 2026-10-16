# Consolidate the Platform dependency updates

Parent workload: Conxian/conxian-business#1390. Candidates: #1431 and #1430.

Both candidates request the same nine dependency upgrades. Keep #1431, which includes current development history and the provider-registration safeguards, and retain #1430 until the combined candidate passes validation.

Align the root Next.js override, dashboard dependency, and regenerated pnpm lockfile at 16.4.0. Preserve the current TypeScript version, workflow gates, authorization behavior, and runtime evidence boundaries. A dependency update does not qualify a provider or deploy a service.

Acceptance: pinned pnpm frozen installation, dependency consistency, workspace typechecking, applicable tests and builds, lifecycle/contamination checks, and hosted checks for the exact published head. Close #1430 only after proving its requested package upgrades are included and the retained candidate is accepted.
