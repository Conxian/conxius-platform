#!/usr/bin/env python3

"""Verify no tracked file (including submodule-linked paths) bears a secret filename.

Prevents credentials from being committed under recognizable filenames such as
`.env`, `*.pem`, `*.key`, `id_rsa*`, `*.p12`, `*.pfx`, `credentials`, etc.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]

EXACT_NAMES = {
    ".env",
    ".env.local",
    ".env.production",
    ".npmrc",
    ".pypirc",
    ".netrc",
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
    "credentials",
    "credentials.json",
    "secrets.json",
    ".htpasswd",
}

SECRET_SUFFIXES = (".pem", ".key", ".p12", ".pfx", ".p8")

SECRET_INFIXES = ("serviceaccount", "service-account", "-credentials", "credentials.")


def git_ls_files() -> list[str]:
    out = subprocess.check_output(["git", "ls-files", "-z"], cwd=REPO_ROOT)
    return [p for p in out.decode("utf-8").split("\0") if p]


def main() -> int:
    violations: list[str] = []

    for file_path in git_ls_files():
        name = file_path.rsplit("/", 1)[-1]
        lower = name.lower()

        if lower in EXACT_NAMES:
            violations.append(file_path)
            continue

        if lower.endswith(SECRET_SUFFIXES):
            violations.append(file_path)
            continue

        if any(infix in lower for infix in SECRET_INFIXES):
            violations.append(file_path)
            continue

    if violations:
        print(
            "Submodule secret filename verification failed: "
            "tracked files with secret-bearing filenames were found:",
            file=sys.stderr,
        )
        for path in violations:
            print(f"- {path}", file=sys.stderr)
        return 1

    print("Submodule secret filename verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
