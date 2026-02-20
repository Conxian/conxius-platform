# Conxian Platform: Deployment Guide

## local Development
1. Clone repo: `git clone --recursive`
2. Init: `make init`
3. Auth: `make auth`
4. Start: `make start`

## Production Deployment

### Gateway (GCP)
The Gateway is designed to run on Google Cloud Platform using the provided Kubernetes manifests in `services/lib-conxian-core/gateway/infrastructure/gcp/`.

### UI (Render)
The UI can be deployed to Render using the `render.yaml` file in `services/conxian-ui/`. Ensure `NEXT_PUBLIC_CORE_API_URL` is set to your production Gateway URL.
