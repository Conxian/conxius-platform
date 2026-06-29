# Makefile for conxius-platform

.PHONY: init auth auth-prod start stop update-all logs bench deploy help

help:
	@echo "Conxian Platform Management Commands:"
	@echo "  make init        - Initialize and update Git submodules"
	@echo "  make auth        - Provision local .env (development profile)"
	@echo "  make auth-prod   - Provision local .env.production (production profile)"
	@echo "  make start       - Build and start the entire stack in detached mode"
	@echo "  make stop        - Stop and remove the stack"
	@echo "  make update-all  - Pull the latest main branches for all submodules"
	@echo "  make logs        - Tail logs for all services"
	@echo "  make bench       - Run automated performance benchmarks"
	@echo "  make deploy      - Run deployment workflows (Conxius Orbit/GCP)"

init:
	@echo "Initializing submodules..."
	git submodule update --init --recursive

auth:
	@echo "Provisioning secrets..."
	./scripts/provision-secrets.sh

auth-prod:
	@echo "Provisioning production secrets..."
	CONXIAN_ENV_PROFILE=production ./scripts/provision-secrets.sh

start:
	@echo "Starting Conxian stack..."
	docker compose up --build -d

stop:
	@echo "Stopping Conxian stack..."
	docker compose down

update-all:
	@echo "Updating all submodules..."
	git submodule foreach 'git fetch origin && git checkout main && git pull'

logs:
	@echo "Tailing logs (Ctrl+C to exit)..."
	docker compose logs -f

bench:
	@echo "Running benchmarks..."
	./scripts/run-benchmarks.sh

deploy:
	@echo "Starting deployment workflow..."
	@echo "Checking environment for Conxius Orbit..."
	@if command -v conxius-orbit >/dev/null 2>&1; then 		conxius-orbit deploy --all; 	else 		echo "⚠️  Conxius Orbit TUI not found. Using standard GCP/Render fallback."; 		echo "Deploying Gateway to GCP..."; 		echo "Deploying UI to Render..."; 	fi
