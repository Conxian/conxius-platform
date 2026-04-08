#!/usr/bin/env python3

from __future__ import annotations

import re
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


def compute_repo_root() -> Path:
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=Path(__file__).resolve().parent,
            text=True,
            encoding="utf-8",
        )
    except FileNotFoundError:
        print(
            "verify_submodule_integrity.py requires `git` to be installed and on PATH.",
            file=sys.stderr,
        )
        raise SystemExit(1)
    except subprocess.CalledProcessError:
        print(
            "verify_submodule_integrity.py must be run from within a Git working tree.",
            file=sys.stderr,
        )
        raise SystemExit(1)

    return Path(out.strip())


@dataclass(frozen=True)
class SubmoduleMapping:
    name: str
    path: str
    url: str | None


def git_gitlink_paths(repo_root: Path) -> set[str]:
    out = subprocess.check_output(
        ["git", "ls-files", "-s", "-z"],
        cwd=repo_root,
        text=True,
        encoding="utf-8",
    )
    entries = [e for e in out.split("\0") if e]

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

def parse_gitmodules(repo_root: Path) -> list[SubmoduleMapping]:
    gitmodules_path = repo_root / ".gitmodules"
    if not gitmodules_path.is_file():
        return []

    try:
        raw = subprocess.check_output(
            [
                "git",
                "config",
                "--file",
                ".gitmodules",
                "--get-regexp",
                r"^submodule\..*\.(path|url)$",
            ],
            cwd=repo_root,
            text=True,
            encoding="utf-8",
        )
    except subprocess.CalledProcessError as exc:
        if exc.returncode == 1:
            return []
        raise

    entry_re = re.compile(r"^submodule\.(?P<name>.+)\.(?P<field>path|url)$")
    by_name: dict[str, dict[str, str]] = {}
    invalid_missing_values: set[tuple[str, str]] = set()

    for raw_line in raw.splitlines():
        # Format from `git config --get-regexp`: "<key><whitespace><value>".
        parts = raw_line.split(None, 1)
        if not parts:
            continue

        key = parts[0]
        match = entry_re.match(key)
        if not match:
            continue

        name = match.group("name")
        field = match.group("field")

        if len(parts) == 1:
            invalid_missing_values.add((name, field))
            continue

        value = parts[1]
        by_name.setdefault(name, {})[field] = value.strip()

    failures: list[str] = []

    if invalid_missing_values:
        failures.append(
            "Invalid .gitmodules config entries missing a value:\n"
            + "\n".join(
                f"- {name} ({field})" for name, field in sorted(invalid_missing_values)
            )
        )

    missing_path_value_names = {
        name for name, field in invalid_missing_values if field == "path"
    }
    invalid_missing_path = sorted(
        name
        for name, fields in by_name.items()
        if fields.get("url") is not None
        and not fields.get("path")
        and name not in missing_path_value_names
    )
    if invalid_missing_path:
        failures.append(
            "Invalid .gitmodules entries missing a path:\n"
            + "\n".join(f"- {name}" for name in invalid_missing_path)
        )

    if failures:
        print("\n\n".join(failures), file=sys.stderr)
        raise SystemExit(1)

    mappings: list[SubmoduleMapping] = []
    for name, fields in by_name.items():
        path = fields.get("path")
        if not path:
            continue
        mappings.append(SubmoduleMapping(name=name, path=path, url=fields.get("url")))

    return mappings


def main() -> int:
    repo_root = compute_repo_root()
    gitlinks = git_gitlink_paths(repo_root)
    mappings = parse_gitmodules(repo_root)
    mapped_paths = {m.path for m in mappings}

    failures: list[str] = []

    missing_urls = sorted(m.path for m in mappings if not m.url)
    if missing_urls:
        failures.append(
            "Found .gitmodules entries without a url:\n"
            + "\n".join(f"- {p}" for p in missing_urls)
        )

    path_counts = Counter(m.path for m in mappings)
    duplicate_paths = sorted(p for p, count in path_counts.items() if count > 1)
    if duplicate_paths:
        failures.append(
            "Found duplicate .gitmodules paths:\n"
            + "\n".join(f"- {p}" for p in duplicate_paths)
        )

    name_counts = Counter(m.name for m in mappings)
    duplicate_names = sorted(n for n, count in name_counts.items() if count > 1)
    if duplicate_names:
        failures.append(
            "Found duplicate .gitmodules names:\n"
            + "\n".join(f"- {n}" for n in duplicate_names)
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
