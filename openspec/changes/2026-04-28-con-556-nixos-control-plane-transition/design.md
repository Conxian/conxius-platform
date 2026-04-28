# Design: NixOS Control Plane Topology

## 1. Directory Structure
The platform repository will be restructured to house NixOS Flakes:

```
.
├── nixos/
│   ├── common/             # Shared node settings
│   ├── gateway/            # Gateway node configuration
│   ├── nexus/              # Nexus Glass Node configuration
│   └── secrets/            # sops-nix encrypted material
├── flake.nix               # Main entry point
└── flake.lock
```

## 2. Secret Flow
1. Developer encrypts sensitive variables using `sops` and the target node's `age` key.
2. Encrypted YAML/JSON is committed to `nixos/secrets/`.
3. During deployment (`nixos-rebuild`), `sops-nix` handles the localized decryption into `/run/secrets`.

## 3. Deployment Flow
- **Pull Model**: Nodes periodically poll the configuration repository and rebuild themselves if changes are detected.
- **Verification**: Each build is compared against a deterministic hash before activation.
