#!/usr/bin/env python3
"""Validate the PaaS service catalog against the local workspace."""
from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "platform/services.catalog.json"
ALLOWED_STATES = {"active", "source-consumed", "quarantined", "deprecated", "archived"}
REQUIRED = {"id", "path", "state", "ownerRepository", "runtime", "entrypoint", "contracts", "dependencies", "deployment", "removalCriteria"}


def fail(message: str) -> None:
    print(f"service-catalog: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> int:
    try:
        data = json.loads(CATALOG.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot read catalog: {exc}")
    services = data.get("services")
    if not isinstance(services, list) or not services:
        fail("services must be a non-empty list")
    ids: set[str] = set()
    for service in services:
        if not isinstance(service, dict):
            fail("each service must be an object")
        missing = REQUIRED - service.keys()
        if missing:
            fail(f"{service.get('id', '<unknown>')} missing {sorted(missing)}")
        service_id = service["id"]
        if service_id in ids:
            fail(f"duplicate service id: {service_id}")
        ids.add(service_id)
        if service["state"] not in ALLOWED_STATES:
            fail(f"{service_id} has invalid lifecycle state {service['state']!r}")
        path = ROOT / service["path"]
        if not path.is_dir():
            fail(f"{service_id} path does not exist: {service['path']}")
        if "/" not in service["ownerRepository"].strip():
            fail(f"{service_id} has invalid owner repository identifier")
        if not service["contracts"]:
            fail(f"{service_id} must declare at least one contract")
        if not service["removalCriteria"].strip():
            fail(f"{service_id} must declare removal criteria")
    print(f"service-catalog: PASS ({len(services)} local services, {len(data.get('externalRepositories', []))} external repositories)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
