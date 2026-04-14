# Proposal: Harden support IMAP polling when message source is missing

## Problem
The support mailbox poller uses IMAP `FETCH` with `{ source: true }`, but servers can still return a message record without a `source` payload.

If we immediately mark these messages as `\\Seen`, we risk silently dropping legitimate support emails (e.g., if the missing source was due to a transient IMAP/server issue).

If we do not mark them as seen (or otherwise quarantine them), the worker can repeatedly re-process the same message on every poll, causing log spam and potentially degrading throughput.

## Decision

- If a fetched message is missing `source`, retry a targeted refetch by UID (`fetchOne`) before doing anything else.
- If the refetch still does not include `source`:
  - Attempt to move the message to a quarantine mailbox when `SUPPORT_IMAP_QUARANTINE_MAILBOX` is set.
  - Otherwise, flag (`\\Flagged`) and mark as seen (`\\Seen`) so the message is not repeatedly re-processed, while remaining visible for manual triage.
- If marking `\\Seen` fails, suppress repeated handling for the UID for the lifetime of the worker process.

## Non-goals

- Defining a full long-term quarantine/triage workflow (routing, alerting, dashboards).
- Persisting suppression state across process restarts.
