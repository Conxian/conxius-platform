# Linear Issue Templates

This repository and its constituent services use a standardized issue template to ensure high-quality, high-value improvements.

## Issue Body Template

```text
## Objective

Review this repository and complete the next highest-value improvement using the Conxian GitHub review baseline.

## Repo focus

[Repository name]

## Baseline review context

Known cross-org concerns:

- public/private separation risk
- possible sensitive config exposure such as `.env`
- tracked generated/runtime artifacts such as:
- `node_modules`
- `test-results`
- `playwright-report`
- inconsistent governance and repo standards
- missing files may include:
- `README`
- `LICENSE`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CODEOWNERS`
- changelog / release guidance
- weak release/versioning discipline
- unclear public-facing purpose/status

## Task for agent

Inspect this repository, research further, and choose exactly one high-value, self-contained task.

Priority:

1. Security exposure or public/private boundary risk
2. Sensitive files or generated artifacts tracked in git
3. Missing ignore rules or CI hygiene
4. Missing governance files
5. README / public-facing clarity improvements
6. Release/versioning improvements

## Required workflow

- inspect the repo before making changes
- select one task only
- record evidence for why it was selected
- implement the change fully
- run relevant validation
- update all related docs
- prepare approval-ready notes

## Deliverables

- selected task
- why it was chosen
- evidence found
- files changed
- validation results
- documentation updated
- follow-up items
- approval note

## Constraints

- do not expose or commit secrets
- if likely secrets are found, prioritize remediation and note required rotation/manual follow-up
- avoid broad speculative refactors
- prefer minimal, high-confidence changes
- improve existing governance/docs rather than duplicating them

## Definition of done

- one meaningful repo improvement completed
- relevant validation performed
- docs updated to match
- ready for human approval
```

## How to use

When performing a repository review, use the template above as the basis for the task description in Linear. The agent (Jules) will then use this template to guide its work and ensure all requirements are met.
