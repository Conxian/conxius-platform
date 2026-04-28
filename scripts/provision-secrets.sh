# [DEPRECATED] Transitioning to NixOS/Declarative State. See docs/architecture/SOVEREIGN_REPR_2026.md
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
if command -v gh >/dev/null 2>&1; then
    if ! gh auth status >/dev/null 2>&1; then
        echo "You are not logged into GitHub CLI. (Skipping auth in sandbox)"
    else
        echo "✅ Authenticated as $(gh api user -q .login)"
    fi
else
    echo "⚠️  GitHub CLI (gh) not found. Skipping auth."
fi

# 2. Initialize .env if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo "Step 2: Initializing $ENV_FILE from $SCHEMA_FILE..."
    cp "$SCHEMA_FILE" "$ENV_FILE"
else
    echo "Step 2: $ENV_FILE already exists, checking for missing variables..."
fi

# 3. Process each variable from schema
echo "Step 3: Processing environment variables..."

# Temporary file to store keys from schema
grep -v '^#' "$SCHEMA_FILE" | grep -v '^$' | cut -d'=' -f1 > .keys.tmp

while read -r key; do
    # Check if key exists in .env and has a value
    current_val=$(grep "^$key=" "$ENV_FILE" | head -n 1 | cut -d'=' -f2- || true)

    if [ -z "$current_val" ]; then
        case "$key" in
            GATEWAY_JWT_SECRET|GATEWAY_ADMIN_API_KEY|POSTGRES_PASSWORD|CORE_DB_URI|POSTGRES_USER)
                VAL=""
                if [ "$key" == "CORE_DB_URI" ]; then
                    VAL="postgresql://conxian:secret@db:5432/conxian_db"
                elif [ "$key" == "POSTGRES_USER" ]; then
                    VAL="conxian"
                else
                    VAL=$(openssl rand -hex 32)
                fi

                echo "Provisioning $key..."
                if grep -q "^$key=" "$ENV_FILE"; then
                    # Escape special characters for sed
                    ESCAPED_VAL=$(echo "$VAL" | sed 's/[&/\]/\\&/g')
                    sed -i "s|^$key=.*$|$key=$ESCAPED_VAL|" "$ENV_FILE"
                else
                    echo "$key=$VAL" >> "$ENV_FILE"
                fi
                ;;
        esac
    fi
done < .keys.tmp

rm .keys.tmp

echo "✅ Success! $ENV_FILE has been provisioned."
echo "⚠️  Keep this file secure and NEVER commit it to Git."
