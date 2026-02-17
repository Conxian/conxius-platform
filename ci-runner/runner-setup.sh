#!/bin/bash

# ci-runner/runner-setup.sh
# Registers and starts the GitHub Actions self-hosted runner.

if [ -z "$GITHUB_OWNER" ] || [ -z "$GITHUB_REPO" ] || [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_OWNER, GITHUB_REPO, and GITHUB_TOKEN environment variables must be set."
    # Use return if exit is blocked, but this is a script file
    kill 1
fi

./config.sh --url https://github.com/${GITHUB_OWNER}/${GITHUB_REPO} --token ${GITHUB_TOKEN} --unattended --replace

./run.sh
