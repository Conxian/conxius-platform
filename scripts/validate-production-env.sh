#!/usr/bin/env bash

set -euo pipefail

ENV_FILE="${1:-.env.production.schema}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Production env template '$ENV_FILE' not found."
  exit 1
fi

get_env_value() {
  local key="$1"
  local line
  line=$(grep -E "^${key}=" "$ENV_FILE" | head -n 1 || true)
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  echo "${line#*=}"
}

node_env="$(get_env_value NODE_ENV)"
core_network="$(get_env_value CORE_BITCOIN_NETWORK)"

if [[ "$node_env" != "production" ]]; then
  echo "❌ NODE_ENV must be 'production' in $ENV_FILE (value withheld)."
  exit 1
fi

if [[ "$core_network" != "mainnet" ]]; then
  echo "❌ CORE_BITCOIN_NETWORK must be 'mainnet' in $ENV_FILE (value withheld)."
  exit 1
fi

for forbidden in development testnet; do
  if grep -Eq "^[A-Z0-9_]+=.*${forbidden}.*$" "$ENV_FILE"; then
    echo "❌ Found forbidden production default '$forbidden' in $ENV_FILE."
    grep -En "^[A-Z0-9_]+=.*${forbidden}.*$" "$ENV_FILE" |
      sed -E 's/^([0-9]+):([A-Z0-9_]+)=.*/\1:\2=[redacted]/'
    exit 1
  fi
done

echo "✅ Production env template validation passed for $ENV_FILE"
