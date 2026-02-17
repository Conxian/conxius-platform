# Makefile for conxius-platform

.PHONY: init auth start stop update-all logs help

help:
	@echo "Conxian Platform Management Commands:"
	@echo "  make init        - Initialize and update Git submodules"
	@echo "  make auth        - Provision local .env with secrets"
	@echo "  make start       - Build and start the entire stack in detached mode"
	@echo "  make stop        - Stop and remove the stack"
	@echo "  make update-all  - Pull the latest main branches for all submodules"
	@echo "  make logs        - Tail logs for all services"

init:
	@echo "Initializing submodules..."
	git submodule update --init --recursive

auth:
	@echo "Provisioning secrets..."
	./scripts/provision-secrets.sh

start:
	@echo "Starting Conxian stack..."
	docker-compose up --build -d

stop:
	@echo "Stopping Conxian stack..."
	docker-compose down

update-all:
	@echo "Updating all submodules..."
	git submodule foreach 'git fetch origin && git checkout main && git pull'

logs:
	@echo "Tailing logs (Ctrl+C to exit)..."
	docker-compose logs -f
