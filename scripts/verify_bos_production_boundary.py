#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def git_ls_files() -> list[str]:
    out = subprocess.check_output(["git", "ls-files", "-z"], cwd=REPO_ROOT)
    return [p for p in out.decode("utf-8").split("\0") if p]


def main() -> int:
    failures: list[str] = []

    production_boundary_doc = REPO_ROOT / "docs" / "PRODUCTION_BOUNDARY.md"
    if not production_boundary_doc.exists():
        failures.append("Missing docs/PRODUCTION_BOUNDARY.md")

    tracked_files = git_ls_files()

    stub_files = [p for p in tracked_files if p.endswith(".stub.json")]
    if stub_files:
        failures.append(
            "Found .stub.json files tracked in this repo (allowed only in conxian-business):\n"
            + "\n".join(f"- {p}" for p in stub_files)
        )

    compose_path = REPO_ROOT / "docker-compose.yml"
    if not compose_path.is_file():
        failures.append(
            "Missing docker-compose.yml (required to verify dev-only services are not wired)"
        )
    else:
        try:
            docker_compose = compose_path.read_text("utf-8")
        except OSError as exc:
            failures.append(f"Unable to read docker-compose.yml: {exc}")
        else:
            if "admin-pulse-bos" in docker_compose:
                failures.append(
                    "services/admin-pulse-bos is dev-only and must not be wired into docker-compose.yml"
                )

    if failures:
        print("BOS production boundary verification failed:\n", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("BOS production boundary verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
