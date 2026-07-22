# M2M Service-Key Rotation Runbook

This runbook covers the dashboard-owned M2M service-key registry in issue
#1161. It does not rotate `ADMIN_DASHBOARD_API_KEY`, change another repository,
or mutate a consumer deployment automatically.

## Safety rules

- Use an approved secret manager or an interactive shell. Do not put real
  secrets in scripts, command history, CI logs, `prometheus.yml`, or tickets.
- Never print a rotation response, the `.secret` field, an `X-Service-Key`
  header, or the contents of the registry artifacts.
- A successful rotation secret is one-time. If the response is lost, do not
  retry the same generation expecting the server to replay it.
- The registry is hash-only and dashboard-owned. Consumer updates are manual.
- The file backend is single-writer. Do not run active-active dashboard writers
  against the same registry volume.

## 1. Secure preflight

Set only non-secret connection variables in the current shell. Read the admin
API key interactively or obtain it from the approved secret manager without
echoing it.

```bash
set -euo pipefail

export ADMIN_DASHBOARD_URL="https://admin.example.invalid"
export SERVICE_ID="gateway"
export EXPECTED_GENERATION="1"
read -r -s ADMIN_DASHBOARD_API_KEY

METADATA_FILE=""
ROTATION_FILE=""
ROLLBACK_FILE=""
trap 'rm -f "${METADATA_FILE:-}" "${ROTATION_FILE:-}" "${ROLLBACK_FILE:-}"; unset ADMIN_DASHBOARD_API_KEY' EXIT
```

Confirm deployment and file boundaries without displaying secret values:

```bash
test -n "${ADMIN_DASHBOARD_URL:?missing dashboard URL}"
test -n "${SERVICE_ID:?missing service ID}"
test "${EXPECTED_GENERATION}" -gt 0
test -f "${PROMETHEUS_SCRAPE_PASSWORD_FILE:-.secrets/prometheus-scrape.password}"
test "$(stat -c '%a' "${PROMETHEUS_SCRAPE_PASSWORD_FILE:-.secrets/prometheus-scrape.password}")" = "600"

docker compose config --quiet
docker compose ps admin-dashboard prometheus
```

For Compose deployments, confirm that `admin-dashboard` has the named
`m2m_registry_data` volume mounted at `/var/lib/conxian/m2m` and that Prometheus
and `admin-dashboard` both mount the `prometheus_scrape_password` Compose
secret. Do not use a bind mount to an ephemeral container path for the
registry.

Before the first production rotation, verify that only one dashboard writer is
running and that the registry directory is private. The registry path inside
the container is:

```text
/var/lib/conxian/m2m/service-key-registry.json
```

## 2. Read metadata without credential material

The metadata response contains lifecycle fields only. Store it in a mode-600
temporary file if it must be inspected by a script; do not use `tee` or paste
the response into a log.

```bash
umask 077
METADATA_FILE="$(mktemp)"

curl --silent --show-error --fail-with-body \
  -H "X-Admin-API-Key: ${ADMIN_DASHBOARD_API_KEY}" \
  "${ADMIN_DASHBOARD_URL}/api/v1/m2m/service-keys" \
  >"$METADATA_FILE"

jq -e --arg service "$SERVICE_ID" \
  '.services[] | select(.serviceId == $service) |
   (.generation > 0 and has("activeCreatedAt") and has("previousState"))' \
  "$METADATA_FILE" >/dev/null
```

If the service has no record, stop. V1 does not invent a first key during
rotation; provision the consumer through the approved initial bootstrap path.

## 3. Rotate and capture the one-time response safely

Use a bounded grace period appropriate for the consumer rollout. The example
uses the 24-hour default and does not set a new active expiry.

```bash
ROTATION_FILE="$(mktemp)"
chmod 600 "$ROTATION_FILE"

curl --silent --show-error --fail-with-body \
  -H "X-Admin-API-Key: ${ADMIN_DASHBOARD_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data "{\"expectedGeneration\":${EXPECTED_GENERATION},\"gracePeriodSeconds\":86400}" \
  "${ADMIN_DASHBOARD_URL}/api/v1/m2m/service-keys/${SERVICE_ID}/rotate" \
  >"$ROTATION_FILE"

jq -e --arg service "$SERVICE_ID" --argjson generation "$((EXPECTED_GENERATION + 1))" \
  '.serviceId == $service and .generation == $generation and
   (.secret | type == "string" and length > 0) and
   (.revision | type == "number") and
   (has("rotatedAt") and has("previousGraceUntil"))' \
  "$ROTATION_FILE" >/dev/null

# Pass the secret directly to the approved consumer secret writer's stdin.
# Do not replace this with a command that prints or stores the value in logs.
jq -er '.secret' "$ROTATION_FILE" | approved-secret-store put \
  --service "$SERVICE_ID" --field SERVICE_KEY --stdin

rm -f "$ROTATION_FILE"
```

The `approved-secret-store` command is deployment-specific and is intentionally
not implemented by this repository. Do not use the dashboard rotation endpoint
to mutate another repository or deployment automatically.

## 4. Roll out and validate the consumer

Update the consumer's `X-Service-Key` value using the approved deployment
secret path, then restart or roll out that consumer. The transport value is
`<service-id>:<secret>`; parsing splits only at the first colon.

Validate using the consumer's normal health or authenticated request. Do not
include the raw header in a command transcript. Re-read metadata after the
rotation and confirm:

```bash
curl --silent --show-error --fail-with-body \
  -H "X-Admin-API-Key: ${ADMIN_DASHBOARD_API_KEY}" \
  "${ADMIN_DASHBOARD_URL}/api/v1/m2m/service-keys" \
  >"$METADATA_FILE"

jq -e --arg service "$SERVICE_ID" --argjson generation "$((EXPECTED_GENERATION + 1))" \
  '.services[] | select(.serviceId == $service) |
   .generation == $generation and .previousState == "grace"' \
  "$METADATA_FILE" >/dev/null
```

If the consumer is not updated before grace ends, it will fail closed. Do not
extend the old key by editing the registry or environment. Either complete the
consumer rollout or follow the lost-response/rollback procedure below.

### Special procedure for `admin-dashboard`

`SERVICE_KEY_ADMIN_DASHBOARD` is the dashboard's service identity and is
separate from `ADMIN_DASHBOARD_API_KEY`. Rotate it with the unchanged admin API
key, write only the returned one-time value to the dashboard deployment secret,
and restart `admin-dashboard`. Do not replace or rotate the admin API key as
part of this procedure. Keep the admin API key available until the dashboard
restart and metadata validation are complete.

## 5. Grace completion and expiry checks

After all consumers report the new generation, retain the old value only for
the documented grace window. The registry accepts a previous key only while
both `now < graceUntil` and its optional expiry are true; the exact boundary is
rejected. Verify the metadata transitions from `grace` to `expired` and check
the active generation/expiry metrics without printing the registry.

```bash
curl --silent --show-error --fail-with-body \
  -H "X-Admin-API-Key: ${ADMIN_DASHBOARD_API_KEY}" \
  "${ADMIN_DASHBOARD_URL}/api/v1/m2m/service-keys" \
  | jq -e --arg service "$SERVICE_ID" \
    '.services[] | select(.serviceId == $service) |
     (.previousState == "expired" or .previousState == "none")' \
  >/dev/null
```

## 6. Lost-response recovery and rollback

If the rotation request may have committed but its response was lost:

1. Do not issue an unguarded second rotation.
2. Re-read metadata. The registry may already show the next generation.
3. If the current generation is newer than `EXPECTED_GENERATION`, treat the
   original rotation as committed and begin consumer recovery.
4. If the new consumer secret cannot be recovered, and the old key is still
   inside its effective previous deadline, use the operator rollback endpoint.

```bash
export CURRENT_GENERATION="2"
export TARGET_GENERATION="1"

ROLLBACK_FILE="$(mktemp)"
chmod 600 "$ROLLBACK_FILE"
curl --silent --show-error --fail-with-body \
  -H "X-Admin-API-Key: ${ADMIN_DASHBOARD_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data "{\"expectedGeneration\":${CURRENT_GENERATION},\"targetGeneration\":${TARGET_GENERATION},\"reason\":\"rotation response was lost\"}" \
  "${ADMIN_DASHBOARD_URL}/api/v1/m2m/service-keys/${SERVICE_ID}/rollback" \
  >"$ROLLBACK_FILE"

jq -e --arg service "$SERVICE_ID" \
  '.serviceId == $service and .source == "rollback" and
   (.rollbackOfGeneration == (.generation - 1)) and
   (.rollbackTargetGeneration < .generation) and
   (.activeExpiresAt | type == "string")' \
  "$ROLLBACK_FILE" >/dev/null
rm -f "$ROLLBACK_FILE"
```

Rollback creates a new generation using only the previous hash. It never
reissues the lost plaintext secret. A `409 generation_conflict` means another
operation committed; re-read metadata and do not repeat the rollback with the
same expected generation.

## 7. Registry corruption, lock, or recovery-required state

Symptoms include `503 m2m_registry_unavailable`, a persistent
`m2m_registry_write_failures_total` increase, or a marker/candidate/journal set
that remains after a restart.

1. Stop rotation traffic and preserve the named volume.
2. Stop `admin-dashboard` before inspecting or repairing artifacts.
3. Confirm the lock owner from the PID-only lock file metadata without printing
   the registry or journal contents. Wait at least the bounded five-second lock
   window before classifying it as contention.
4. If the dashboard process is stopped and the recorded PID is not alive,
   preserve the artifact directory, then remove only the stale lock file. Do
   not remove a marker, journal, or candidate as a lock workaround.
5. Restart one dashboard writer and allow marker-qualified recovery to run.
6. If the marker, journal, candidate, active revision, or predecessor identity
   do not match, keep the service stopped and escalate with the preserved
   artifact set. Never select an arbitrary temporary file or fall back to
   environment keys.

Example container commands inspect names and modes only:

```bash
docker compose stop admin-dashboard
docker compose run --rm --no-deps admin-dashboard \
  sh -c 'find /var/lib/conxian/m2m -maxdepth 1 -type f -printf "%f %m\\n" | sort'
docker compose up -d admin-dashboard
```

The implementation writes the lock with mode `0600` and a process ID, and
returns `503 m2m_registry_busy` with `Retry-After: 5` on bounded contention.
Do not delete a lock while its writer is active.

## 8. Restart and persistence check

After a planned restart, verify that the registry revision and service
generation remain unchanged and that a known consumer key still follows the
registry authority rather than a changed environment value. Do not print the
registry JSON.

```bash
docker compose restart admin-dashboard
docker compose ps admin-dashboard prometheus

curl --silent --show-error --fail-with-body \
  -H "X-Admin-API-Key: ${ADMIN_DASHBOARD_API_KEY}" \
  "${ADMIN_DASHBOARD_URL}/api/v1/m2m/service-keys" \
  | jq -e --arg service "$SERVICE_ID" \
    '.services[] | select(.serviceId == $service) | (.generation > 0 and .source != null)' \
  >/dev/null
```

If the generation resets, the named volume is missing or the container is
writing a different path. Stop the deployment and repair persistence before
any rotation.

## 9. Prometheus scrape and alert verification

The scrape password is provisioned by `scripts/provision-secrets.sh` and
mounted as the same Compose secret into Prometheus and `admin-dashboard`.
`prometheus.yml` contains only the username and container-side password-file
path. The `/api/metrics` route remains protected; a valid admin key continues
to work for manual access.

Validate the target and rules without printing credentials:

```bash
docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
docker compose exec prometheus promtool check rules /etc/prometheus/prometheus-alerts.yml
docker compose exec prometheus wget -qO- http://localhost:9090/api/v1/targets \
  | jq -e '.data.activeTargets[] | select(.labels.job == "conxian-admin-dashboard") | .health == "up"' \
  >/dev/null
```

The M2M rules cover active/previous expiry, non-overlapping expiry windows,
authentication-failure bursts, rotation/rollback failures and conflicts,
registry write failures/unavailable observations, and a missing registry
revision metric. Confirm the rules are loaded after a deployment and verify
alert ownership in Alertmanager; this repository does not send Slack or email
notifications directly.

```bash
docker compose exec prometheus wget -qO- http://localhost:9090/api/v1/rules \
  | jq -e '.data.groups[] | select(.name == "m2m-service-key-alerts")' >/dev/null
```

## 10. Cleanup

```bash
unset ADMIN_DASHBOARD_API_KEY ADMIN_DASHBOARD_URL SERVICE_ID EXPECTED_GENERATION
unset CURRENT_GENERATION TARGET_GENERATION METADATA_FILE ROTATION_FILE ROLLBACK_FILE
```

Do not commit `.m2m/`, registry transaction artifacts, or the provisioned
Prometheus password file.
