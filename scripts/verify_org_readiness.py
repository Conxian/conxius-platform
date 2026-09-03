#!/usr/bin/env python3
"""Collect read-only, reproducible readiness evidence for Conxian repositories."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from dataclasses import asdict, dataclass
from typing import Any

REQUIRED_FILES = ("README.md", "SECURITY.md", "CONTRIBUTING.md")

@dataclass
class RepositoryEvidence:
    name: str
    default_branch: str | None
    archived: bool | None
    required_files: dict[str, bool]
    workflow_count: int | None
    branch_protection: str
    status: str
    notes: list[str]


def gh_json(endpoint: str) -> Any:
    result = subprocess.run(["gh", "api", endpoint], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or f"gh api failed: {endpoint}")
    return json.loads(result.stdout)


def inspect_repo(name: str) -> RepositoryEvidence:
    meta = gh_json(f"repos/Conxian/{name}")
    branch = meta.get("default_branch")
    contents = gh_json(f"repos/Conxian/{name}/contents")
    names = {item.get("name") for item in contents if isinstance(item, dict)}
    required = {path: path in names for path in REQUIRED_FILES}
    notes: list[str] = []
    try:
        workflows = gh_json(f"repos/Conxian/{name}/contents/.github/workflows")
        workflow_count = len(workflows) if isinstance(workflows, list) else 0
    except RuntimeError:
        workflow_count = 0
    try:
        gh_json(f"repos/Conxian/{name}/branches/{branch}/protection")
        protection = "verified"
    except RuntimeError:
        protection = "unverified-by-token"
        notes.append("Branch protection requires owner/admin evidence or a token with access.")
    if meta.get("archived"):
        notes.append("Repository is archived; do not treat it as an active delivery target.")
    if not all(required.values()):
        notes.append("One or more baseline governance files are absent.")
    status = "pass" if all(required.values()) and not meta.get("archived") else "owner-action"
    return RepositoryEvidence(name, branch, meta.get("archived"), required, workflow_count, protection, status, notes)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", dest="json_output")
    args = parser.parse_args()
    if not shutil.which("gh"):
        print("[SKIP] gh CLI is not available in local environment for remote org evidence collection.")
        return 0
    try:
        repos = gh_json("orgs/Conxian/repos?per_page=100&type=all")
    except RuntimeError as error:
        print(f"[SKIP] Unable to collect organization evidence: {error}")
        return 0
    evidence = [inspect_repo(repo["name"]) for repo in repos if isinstance(repo, dict) and repo.get("name")]
    if args.json_output:
        print(json.dumps([asdict(item) for item in evidence], indent=2, sort_keys=True))
    else:
        for item in evidence:
            print(f"{item.status.upper():12} {item.name:32} workflows={item.workflow_count} protection={item.branch_protection}")
            for note in item.notes:
                print(f"  - {note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
