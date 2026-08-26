#!/usr/bin/env python3
"""Reject archived repositories from active platform configuration."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "platform/services.catalog.json"
REFERENCES = ROOT / "platform/repository-references.json"


def main() -> int:
    catalog = json.loads(CATALOG.read_text())
    references = json.loads(REFERENCES.read_text())["repositories"]
    archived = {name for name, item in references.items() if item.get("state") == "archived"}
    errors: list[str] = []
    for service in catalog.get("services", []):
        owner = service.get("ownerRepository")
        if owner in archived:
            errors.append(f"service {service.get('id')} is owned by archived repository {owner}")
        for dependency in service.get("dependencies", []):
            if dependency in archived:
                errors.append(f"service {service.get('id')} depends on archived repository {dependency}")
    if errors:
        for error in errors:
            print(f"repository-references: {error}")
        return 1
    print("repository-references: active catalog contains no archived repository dependency")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
