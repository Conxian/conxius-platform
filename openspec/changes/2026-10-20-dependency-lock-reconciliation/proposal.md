# Reconcile grouped dependency update with workspace ownership

Continue PR #1466 without discarding its useful dependency fixes. Hosted failures identify a Next manifest/lock mismatch: the dashboard requests 16.4.2 while the root override and importer still pin 16.4.0. Align the existing root ownership override to the already selected dashboard version, then regenerate using repository-pinned pnpm 9.15.5. Preserve other intentional overrides and policy checks. Verify dependency consistency, frozen install, service tests/typechecks/builds and hosted checks; do not weaken checks or approve release evidence from version metadata alone. Track under Business #1414/#1390.

## 28 October continuation — PR #1478

The same ownership mismatch recurred when the dashboard advanced to Next.js 16.4.3 but the root override and lock importer remained 16.4.2. Align the root override with the already selected patch and regenerate with pinned pnpm 9.15.5; retain all other grouped upgrades, including Nodemailer 10.2.1. Run the existing consistency guard, frozen install, workspace tests/typechecks/builds and exact-head hosted checks. No advisory exemptions, workflow changes or production acceptance are introduced. Business #1390/#1414 remain the coordinating records.
