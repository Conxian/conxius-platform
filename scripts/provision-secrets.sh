#!/usr/bin/env bash

# [DEPRECATED] Transitioning to NixOS/Declarative State. See docs/architecture/SOVEREIGN_REPR_2026.md
# scripts/provision-secrets.sh
# Securely fetches and generates environment variables for Conxian Platform.

set -euo pipefail

PROFILE="${CONXIAN_ENV_PROFILE:-development}"

case "$PROFILE" in
  development)
    ENV_FILE="${CONXIAN_ENV_FILE:-.env}"
    SCHEMA_FILE="${CONXIAN_SCHEMA_FILE:-.env.schema}"
    ;;
  production)
    ENV_FILE="${CONXIAN_ENV_FILE:-.env.production}"
    SCHEMA_FILE="${CONXIAN_SCHEMA_FILE:-.env.production.schema}"
    ;;
  *)
    echo "❌ Unsupported CONXIAN_ENV_PROFILE '$PROFILE'. Use 'development' or 'production'."
    exit 1
    ;;
esac

echo "🔐 Starting Conxian Secret Provisioning (${PROFILE})..."

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "❌ Schema file '$SCHEMA_FILE' not found."
  exit 1
fi

# 1. Identity Proofing
echo "Step 1: Authenticating with GitHub..."
if command -v gh >/dev/null 2>&1; then
  if ! gh auth status >/dev/null 2>&1; then
    echo "You are not logged into GitHub CLI. (Skipping auth in sandbox)"
  else
    GH_LOGIN=$(gh api user -q .login 2>/dev/null || true)
    if [[ "$GH_LOGIN" =~ ^[A-Za-z0-9-]+$ ]]; then
      echo "✅ Authenticated as $GH_LOGIN"
    else
      echo "✅ GitHub CLI authentication detected."
    fi
  fi
else
  echo "⚠️  GitHub CLI (gh) not found. Skipping auth."
fi

# 2. Initialize env file if it doesn't exist
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Step 2: Initializing $ENV_FILE from $SCHEMA_FILE..."
  cp "$SCHEMA_FILE" "$ENV_FILE"
else
  echo "Step 2: $ENV_FILE already exists, checking for missing variables..."
fi

get_env_value() {
  local key="$1"
  local line
  line=$(grep -E "^${key}=" "$ENV_FILE" | head -n 1 || true)
  if [[ -z "$line" ]]; then
    echo ""
  else
    echo "${line#*=}"
  fi
}

set_env_value() {
  local key="$1"
  local value="$2"
  local escaped
  escaped=$(printf '%s' "$value" | sed -e 's/[\\/&]/\\&/g')

  if grep -q -E "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*$|${key}=${escaped}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

is_placeholder_secret() {
  local value
  value=$(echo "$1" | tr '[:upper:]' '[:lower:]')
  [[ "$value" == "secret" || "$value" == "password" || "$value" == "changeme" || "$value" == "admin" ]]
}

uri_has_placeholder_secret() {
  local value
  value=$(echo "$1" | tr '[:upper:]' '[:lower:]')
  [[ "$value" == *":secret@"* || "$value" == *":password@"* || "$value" == *":changeme@"* ]]
}

# 3. Process each variable from schema
echo "Step 3: Processing environment variables..."

KEYS_TMP=$(mktemp)
trap 'rm -f "$KEYS_TMP"' EXIT

grep -v '^#' "$SCHEMA_FILE" | grep -v '^$' | cut -d'=' -f1 > "$KEYS_TMP"

while read -r key; do
  current_val=$(get_env_value "$key")

  if [[ -z "$current_val" ]]; then
    case "$key" in
      GATEWAY_JWT_SECRET|GATEWAY_ADMIN_API_KEY|POSTGRES_PASSWORD|GRAFANA_PASSWORD)
        VAL=$(openssl rand -hex 32)
        echo "Provisioning $key..."
        set_env_value "$key" "$VAL"
        ;;
      POSTGRES_USER)
        echo "Provisioning $key..."
        set_env_value "$key" "conxian"
        ;;
    esac
  fi
done < "$KEYS_TMP"

POSTGRES_USER_VAL=$(get_env_value POSTGRES_USER)
POSTGRES_PASSWORD_VAL=$(get_env_value POSTGRES_PASSWORD)
POSTGRES_DB_VAL=$(get_env_value POSTGRES_DB)
CORE_DB_URI_VAL=$(get_env_value CORE_DB_URI)
GRAFANA_PASSWORD_VAL=$(get_env_value GRAFANA_PASSWORD)

if [[ -z "$POSTGRES_DB_VAL" ]]; then
  POSTGRES_DB_VAL="conxian_db"
  set_env_value POSTGRES_DB "$POSTGRES_DB_VAL"
fi

if [[ -z "$POSTGRES_USER_VAL" || -z "$POSTGRES_PASSWORD_VAL" ]]; then
  echo "❌ POSTGRES_USER and POSTGRES_PASSWORD must be set before generating CORE_DB_URI."
  exit 1
fi

if is_placeholder_secret "$POSTGRES_PASSWORD_VAL"; then
  echo "❌ POSTGRES_PASSWORD uses an insecure placeholder value."
  exit 1
fi

if [[ -n "$GRAFANA_PASSWORD_VAL" ]] && is_placeholder_secret "$GRAFANA_PASSWORD_VAL"; then
  echo "❌ GRAFANA_PASSWORD uses an insecure placeholder value."
  exit 1
fi

if [[ -n "$CORE_DB_URI_VAL" ]] && uri_has_placeholder_secret "$CORE_DB_URI_VAL"; then
  echo "❌ CORE_DB_URI contains placeholder credentials (e.g. 'secret'). Refusing to continue."
  exit 1
fi

if [[ -z "$CORE_DB_URI_VAL" ]]; then
  CORE_DB_URI_VAL="postgresql://${POSTGRES_USER_VAL}:${POSTGRES_PASSWORD_VAL}@db:5432/${POSTGRES_DB_VAL}"
  echo "Provisioning CORE_DB_URI from generated Postgres credentials..."
  set_env_value CORE_DB_URI "$CORE_DB_URI_VAL"
fi

if [[ "$CORE_DB_URI_VAL" =~ ^postgres(ql)?://([^:]+):([^@]+)@ ]]; then
  URI_USER="${BASH_REMATCH[2]}"
  URI_PASSWORD="${BASH_REMATCH[3]}"

  if [[ "$URI_USER" != "$POSTGRES_USER_VAL" || "$URI_PASSWORD" != "$POSTGRES_PASSWORD_VAL" ]]; then
    echo "❌ CORE_DB_URI credentials must match POSTGRES_USER/POSTGRES_PASSWORD."
    exit 1
  fi
else
  echo "❌ CORE_DB_URI must be a valid postgres URI (postgresql://user:password@host:port/db)."
  exit 1
fi

echo "✅ Success! $ENV_FILE has been provisioned."
echo "⚠️  Keep this file secure and NEVER commit it to Git."
