#!/usr/bin/env python3

"""Verify no tracked file (including submodule-linked paths) bears a secret filename.

Prevents credentials from being committed under recognizable filenames such as
`.env`, `*.pem`, `*.key`, `id_rsa*`, `*.p12`, `*.pfx`, `credentials`, etc.
"""

from __future__ import annotations

import re
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

# Config files that are only a problem when they carry a credential. A tracked
# `.npmrc`/`.pypirc`/`.netrc` that sets non-secret options (e.g. engine-strict)
# is fine; one that carries a token is not. Matched case-insensitively.
CREDENTIAL_WHEN_POPULATED = {".npmrc", ".pypirc", ".netrc"}
# A line that sets a credential: an auth token, password, or a _auth-ish key.
CREDENTIAL_LINE_RE = re.compile(
    r"(?im)^\s*[^#\s].*?(_auth|_authToken|_password|:password|token|api[_-]?key|"
    r"//[^\s]+:_|password\s*=)",
)

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

        if lower in CREDENTIAL_WHEN_POPULATED:
            # Only a violation if the config actually carries a credential.
            try:
                content = (REPO_ROOT / file_path).read_text(encoding="utf-8", errors="ignore")
            except OSError:
                content = ""
            if CREDENTIAL_LINE_RE.search(content):
                violations.append(file_path)
            continue

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
