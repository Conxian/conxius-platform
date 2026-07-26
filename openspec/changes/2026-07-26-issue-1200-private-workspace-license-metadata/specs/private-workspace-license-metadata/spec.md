# Private Workspace License Metadata

## ADDED Requirements

### Requirement: Private workspace manifests reflect existing repository license terms

The root package manifest and each first-party private workspace service manifest SHALL declare the SPDX identifier `MIT`, matching the MIT license text already present at the corresponding repository boundary.

#### Scenario: Maintainer inspects first-party package metadata

- **WHEN** a maintainer inspects the root manifest or a first-party private service manifest
- **THEN** its `license` field is `MIT`
- **AND** its private-package, dependency, publication, release, and runtime configuration is otherwise unchanged by this alignment

#### Scenario: License authority is evaluated

- **WHEN** the metadata alignment is reviewed
- **THEN** the existing `LICENSE` files remain the authoritative license text
- **AND** the alignment does not relicense code or change copyright ownership
