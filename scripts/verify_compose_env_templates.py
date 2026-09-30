#!/usr/bin/env python3

"""Verify compose environment-variable templates are complete.

Every `${VAR}` (and `${VAR:?...}`) referenced in docker-compose.yml without a
fallback default must be documented in .env.example so the compose surface can
be configured from the template. Fallback forms (`${VAR:-default}`) are exempt.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
COMPOSE_PATH = REPO_ROOT / "docker-compose.yml"
ENV_TEMPLATE_PATH = REPO_ROOT / ".env.example"

# Matches ${VAR} and ${VAR:?...} / ${VAR:+...} (required/alternate, no fallback)
# but NOT ${VAR:-default} (which carries a safe default).
VAR_REF = re.compile(r"\$\{([A-Za-z_][A-Za-z0-9_]*)(?::[?+][^}]*)?\}")

# Matches a documented key, including commented-out templates (`# VAR=...`).
DOCUMENTED_KEY = re.compile(
    r"^[#\s]*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=", re.MULTILINE
)


def main() -> int:
    failures: list[str] = []

    if not COMPOSE_PATH.is_file():
        failures.append("missing docker-compose.yml")
    if not ENV_TEMPLATE_PATH.is_file():
        failures.append("missing .env.example")

    if failures:
        print("Compose env template verification failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    compose = COMPOSE_PATH.read_text("utf-8")
    template = ENV_TEMPLATE_PATH.read_text("utf-8")

    documented = set(DOCUMENTED_KEY.findall(template))
    referenced = set(VAR_REF.findall(compose))

    missing = sorted(v for v in referenced if v not in documented)
    if missing:
        print(
            "Compose env template verification failed: "
            "docker-compose.yml references these variables but they are missing from .env.example:",
            file=sys.stderr,
        )
        for var in missing:
            print(f"- {var}", file=sys.stderr)
        return 1

    print("Compose env template verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
