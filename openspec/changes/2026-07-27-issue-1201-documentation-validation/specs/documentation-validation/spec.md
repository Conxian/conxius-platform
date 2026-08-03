# Documentation Validation

## ADDED Requirements

### Requirement: Active repository-local Markdown paths validation

The platform documentation validation script SHALL parse active Markdown files to verify that all relative local Markdown links point to existing files or directories in the workspace.

#### Scenario: Active local Markdown link path is validated

- **WHEN** a link references a file or directory relative to the source Markdown file
- **THEN** the target path is checked for physical existence in the workspace
- **AND** any non-existent path is reported as a documentation validation failure

### Requirement: Markdown heading fragment and anchor validation

The documentation validation script SHALL verify that relative link fragments/anchors correspond to actual headings or explicit HTML anchor tags in the target Markdown documents.

#### Scenario: Heading fragment link is validated

- **WHEN** a relative local link contains an anchor segment (e.g. `#my-heading`)
- **THEN** the target file is scanned for a matching slugified heading or explicit anchor tag
- **AND** any mismatch or missing fragment is flagged as a validation error
