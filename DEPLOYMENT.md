# Conxius Platform: Deployment Guide (Sovereign Redesign 2026)

## Declarative NixOS Deployment (Target)
The Conxius Platform is transitioning to a purely declarative deployment model using NixOS.

1. **Install Nix**: Ensure Nix is installed on your local machine and target nodes.
2. **Configure Flake**: Update `flake.nix` with your target node definitions.
3. **Provision Secrets**: Use `sops` to encrypt node-specific secrets in `nixos/secrets/`.
4. **Deploy**:
   ```bash
   nixos-rebuild --flake .#your-node-name --target-host root@node-ip switch
   ```

## Legacy Local Development (Docker-based)
1. Clone repo: `git clone --recursive`
2. Init: `make init`
3. Auth: `make auth` (Deprecated - use sops-nix for production)
4. Start: `make start`

## Legacy Production Deployment (Cloud-Native)

### Gateway (GCP)
The Gateway is designed to run on Google Cloud Platform using the provided Kubernetes manifests in `services/lib-conxian-core/gateway/infrastructure/gcp/`.

### UI (Render)
The UI can be deployed to Render using the `render.yaml` file in `services/conxian-ui/`. Ensure `NEXT_PUBLIC_CORE_API_URL` is set to your production Gateway URL.
