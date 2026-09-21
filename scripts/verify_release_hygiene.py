#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

SERVICE_PACKAGE_JSONS = [
    REPO_ROOT / "package.json",
    REPO_ROOT / "services" / "admin-dashboard" / "package.json",
    REPO_ROOT / "services" / "admin-pulse-bos" / "package.json",
    REPO_ROOT / "services" / "elizaos-plugin-conxian" / "package.json",
]

def main() -> int:
    failures: list[str] = []

    # 1. Check Root CHANGELOG.md exists and is non-empty
    changelog = REPO_ROOT / "CHANGELOG.md"
    if not changelog.exists() or changelog.stat().st_size == 0:
        failures.append("Root CHANGELOG.md is missing or empty.")

    # 2. Check Service Package Versions Synchronized
    versions: dict[str, str] = {}
    for p in SERVICE_PACKAGE_JSONS:
        if not p.exists():
            failures.append(f"Missing package.json file: {p.relative_to(REPO_ROOT)}")
            continue
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                ver = data.get("version")
                if not ver:
                    failures.append(f"No version field in {p.relative_to(REPO_ROOT)}")
                else:
                    versions[str(p.relative_to(REPO_ROOT))] = ver
        except Exception as e:
            failures.append(f"Error reading {p.relative_to(REPO_ROOT)}: {e}")

    unique_versions = set(versions.values())
    if len(unique_versions) > 1:
        failures.append(f"Package versions are out of sync across services: {versions}")

    if failures:
        print("[FAIL] Release hygiene verification failed!")
        for f in failures:
            print(f"  - {f}")
        return 1

    common_ver = list(unique_versions)[0] if unique_versions else "unknown"
    print(f"[PASS] Release hygiene verification passed. All workspace packages synchronized at v{common_ver}.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
