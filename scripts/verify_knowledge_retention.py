#!/usr/bin/env python3

"""Verify knowledge-retention artifacts are present and non-empty.

Guards the self-evolving knowledge base chain (AGENTS.md, KB store,
session continuity) so a bad merge cannot silently drop retained knowledge.
"""

from __future__ import annotations

import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_ARTIFACTS = [
    "AGENTS.md",
    "docs/SELF_EVOLVING_KB.md",
    "docs/SESSION_CONTINUITY.md",
    "scripts/kb/knowledge-store.ts",
]


def main() -> int:
    failures: list[str] = []

    for rel in REQUIRED_ARTIFACTS:
        path = REPO_ROOT / rel
        if not path.is_file():
            failures.append(f"missing {rel}")
        elif path.stat().st_size == 0:
            failures.append(f"empty {rel}")

    if failures:
        print("Knowledge retention verification failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("Knowledge retention verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
