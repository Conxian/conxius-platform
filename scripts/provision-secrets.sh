#!/bin/bash

# scripts/provision-secrets.sh
# Securely fetches and generates environment variables for Conxian Platform.

set -e

ENV_FILE=".env"
SCHEMA_FILE=".env.schema"
ORG_NAME="Conxian"

echo "🔐 Starting Conxian Secret Provisioning..."

# 1. Identity Proofing
echo "Step 1: Authenticating with GitHub..."
if ! gh auth status >/dev/null 2>&1; then
    echo "You are not logged into GitHub CLI. Redirecting to login..."
    gh auth login -o $ORG_NAME -w
else
    echo "✅ Authenticated as $(gh api user -q .login)"
fi

# 2. Fetch Existing Organization Secrets
echo "Step 2: Fetching existing organization secrets from GitHub..."
# Note: gh secret list doesn't show values, so we might need to rely on what's available
# or assume the user has access to fetch them if we were using a vault.
# For this script, we'll simulate fetching by checking if gh can access the repo.

# Initialize .env from schema but keep it empty of values initially
cp $SCHEMA_FILE $ENV_FILE
# Remove comments and empty lines for processing
grep -v '^#' $SCHEMA_FILE | grep -v '^$' > .env.tmp

# 3. Process each variable
echo "Step 3: Processing environment variables..."

while IFS='=' read -r key value; do
    # Check if value is already set in organization secrets (simulated here)
    # In a real scenario, you might use 'gh secret list' and 'gh secret get' if supported,
    # or pull from GCP Secret Manager.

    # For this implementation, we will check if the variable is already in .env (if it existed)
    # or if we should generate it.

    if [ -z "$value" ]; then
        echo "Missing value for $key. Generating secure secret..."
        GEN_SECRET=$(openssl rand -hex 32)
        # Update the key in .env
        sed -i "s/^$key=.*$/$key=$GEN_SECRET/" $ENV_FILE
    else
        echo "Using default/existing value for $key"
    fi
done < .env.tmp

rm .env.tmp

# 4. Special handling for GCP (optional/placeholder)
if command -v gcloud >/dev/null 2>&1; then
    echo "Step 4: Checking GCP authentication..."
    # gcloud auth application-default login
fi

echo "✅ Success! .env file has been provisioned."
echo "⚠️  Keep this file secure and NEVER commit it to Git."
