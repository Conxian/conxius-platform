#!/usr/bin/env python3

"""Verify pull requests that touch BOS production-boundary paths are classified.

Runs only in a pull-request CI context (GITHUB_EVENT_PATH with a `pull_request`
payload and a `gh` CLI authenticated via GITHUB_TOKEN). In any other context the
check is skipped so it never spuriously fails push/local runs.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]

BOS_BOUNDARY_PATHS = [
    "services/admin-pulse-bos/",
    "docker-compose.yml",
    "docs/PRODUCTION_BOUNDARY.md",
]

# Accept any of these labels as a valid BOS classification.
CLASSIFICATION_LABELS = {
    "bos-boundary",
    "bos-production-boundary",
    "production-boundary",
    "control-plane",
}


def _gh(*args: str) -> str | None:
    try:
        out = subprocess.run(
            ["gh", *args],
            check=True,
            capture_output=True,
            text=True,
            cwd=REPO_ROOT,
        )
        return out.stdout
    except (OSError, subprocess.CalledProcessError):
        return None


def main() -> int:
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    if not event_path or not Path(event_path).is_file():
        print("PR BOS classification verification skipped (no PR event context)")
        return 0

    try:
        event = json.loads(Path(event_path).read_text("utf-8"))
    except (OSError, json.JSONDecodeError):
        print("PR BOS classification verification skipped (unreadable event payload)")
        return 0

    if "pull_request" not in event:
        print("PR BOS classification verification skipped (non-PR event)")
        return 0

    pr_number = event.get("number") or event.get("pull_request", {}).get("number")
    if not pr_number:
        print("PR BOS classification verification skipped (no PR number)")
        return 0

    files_out = _gh("pr", "view", str(pr_number), "--json", "files", "--jq", ".files[].path")
    labels_out = _gh("pr", "view", str(pr_number), "--json", "labels", "--jq", ".labels[].name")

    if files_out is None or labels_out is None:
        print("PR BOS classification verification skipped (gh CLI unavailable)")
        return 0

    changed_files = [line for line in files_out.splitlines() if line.strip()]
    labels = {line.strip().lower() for line in labels_out.splitlines() if line.strip()}

    touches_bos = any(
        path.startswith(prefix) for prefix in BOS_BOUNDARY_PATHS for path in changed_files
    )

    if not touches_bos:
        print("PR BOS classification verification passed (no BOS boundary paths touched)")
        return 0

    if labels & CLASSIFICATION_LABELS:
        print("PR BOS classification verification passed")
        return 0

    print(
        "PR BOS classification verification failed: PR touches BOS production-boundary "
        "paths but carries none of the classification labels "
        f"({', '.join(sorted(CLASSIFICATION_LABELS))})",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
