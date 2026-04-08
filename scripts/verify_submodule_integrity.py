#!/usr/bin/env python3

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class SubmoduleMapping:
    name: str
    path: str
    url: str | None


def git_gitlink_paths() -> set[str]:
    out = subprocess.check_output(["git", "ls-files", "-s", "-z"], cwd=REPO_ROOT)
    entries = [e for e in out.decode("utf-8").split("\0") if e]

    gitlinks: set[str] = set()
    for entry in entries:
        # Format: "<mode> <sha> <stage>\t<path>"
        parts = entry.split("\t", 1)
        if len(parts) != 2:
            continue

        meta, path = parts
        mode = meta.split(" ", 1)[0]
        if mode == "160000":
            gitlinks.add(path)

    return gitlinks


SUBMODULE_HEADER_RE = re.compile(r'^\[submodule\s+"(?P<name>.+)"\]\s*$')


def parse_gitmodules() -> list[SubmoduleMapping]:
    gitmodules_path = REPO_ROOT / ".gitmodules"
    if not gitmodules_path.is_file():
        return []

    mappings: list[SubmoduleMapping] = []

    current_name: str | None = None
    current_path: str | None = None
    current_url: str | None = None

    def flush() -> None:
        nonlocal current_name, current_path, current_url
        if current_name and current_path:
            mappings.append(
                SubmoduleMapping(name=current_name, path=current_path, url=current_url)
            )
        current_name = None
        current_path = None
        current_url = None

    for raw_line in gitmodules_path.read_text("utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue

        header_match = SUBMODULE_HEADER_RE.match(line)
        if header_match:
            flush()
            current_name = header_match.group("name")
            continue

        if current_name is None:
            continue

        key, has_sep, value = line.partition("=")
        if not has_sep:
            continue

        key = key.strip()
        value = value.strip()

        if key == "path":
            current_path = value
        elif key == "url":
            current_url = value

    flush()
    return mappings


def main() -> int:
    gitlinks = git_gitlink_paths()
    mappings = parse_gitmodules()
    mapped_paths = {m.path for m in mappings}

    failures: list[str] = []

    missing_urls = sorted(m.path for m in mappings if not m.url)
    if missing_urls:
        failures.append(
            "Found .gitmodules entries without a url:\n"
            + "\n".join(f"- {p}" for p in missing_urls)
        )

    path_list = [m.path for m in mappings]
    duplicate_paths = sorted({p for p in path_list if path_list.count(p) > 1})
    if duplicate_paths:
        failures.append(
            "Found duplicate .gitmodules paths:\n"
            + "\n".join(f"- {p}" for p in duplicate_paths)
        )

    missing_mappings = sorted(gitlinks - mapped_paths)
    if missing_mappings:
        failures.append(
            "Missing .gitmodules mappings for gitlink entries:\n"
            + "\n".join(f"- {p}" for p in missing_mappings)
        )

    missing_gitlinks = sorted(mapped_paths - gitlinks)
    if missing_gitlinks:
        failures.append(
            "Found .gitmodules mappings that are not gitlink entries in the repo:\n"
            + "\n".join(f"- {p}" for p in missing_gitlinks)
        )

    if failures:
        print("Submodule integrity verification failed:\n", file=sys.stderr)
        for failure in failures:
            print(failure, file=sys.stderr)
        return 1

    print("Submodule integrity verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
