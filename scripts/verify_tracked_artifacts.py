#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

DISALLOWED_ARTIFACT_PATTERNS = [
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "target/",
    "test-results/",
    "playwright-report/",
    "blob-report/",
    "coverage/",
    ".coverage",
    ".pytest_cache/",
    ".cache/",
    ".tsbuildinfo",
]

def git_ls_files() -> list[str]:
    out = subprocess.check_output(["git", "ls-files", "-z"], cwd=REPO_ROOT)
    return [p for p in out.decode("utf-8").split("\0") if p]

def main() -> int:
    tracked_files = git_ls_files()
    violations: list[str] = []

    for file_path in tracked_files:
        for pattern in DISALLOWED_ARTIFACT_PATTERNS:
            if pattern.endswith("/"):
                if f"/{pattern}" in f"/{file_path}" or file_path.startswith(pattern):
                    violations.append(f"{file_path} (matches pattern '{pattern}')")
            else:
                if file_path.endswith(pattern) or f"/{pattern}" in file_path:
                    violations.append(f"{file_path} (matches pattern '{pattern}')")

    if violations:
        print("[FAIL] Tracked artifacts verification failed! The following tracked files are forbidden build/test artifacts:")
        for v in violations:
            print(f"  - {v}")
        return 1

    print("[PASS] Tracked artifacts verification passed. No disallowed build/test artifacts tracked.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
