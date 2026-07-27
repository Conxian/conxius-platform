#!/usr/bin/env python3
"""Validate active repository-local Markdown links and documentation entry points."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote, urlsplit


EXCLUDED_DIRECTORY_NAMES = {
    ".git",
    ".next",
    ".turbo",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "test-results",
    "vendor",
}

HISTORICAL_PREFIXES = (
    ("docs", "archived-reports"),
    ("docs", "archived-scripts"),
    ("docs", "archived-tasks"),
    ("openspec", "changes", "archive"),
)

# GOVERNANCE.md must identify the historical roots in order to define their
# non-authoritative status. No other active source receives this exception.
HISTORICAL_LINK_EXCEPTIONS = {
    "GOVERNANCE.md": HISTORICAL_PREFIXES,
}

# These paths are declared as active entry points by AGENTS.md, the discovery
# manifest/onboarding contract, docs/INFORMATION_HIERARCHY.md, or GOVERNANCE.md.
REQUIRED_ENTRY_PATHS = {
    "agent bootstrap": (
        "AGENTS.md",
        "GOVERNANCE.md",
        "docs/AGENT_ONBOARDING.md",
        "docs/SESSION_CONTINUITY.md",
        ".agents/manifest.json",
    ),
    "canonical documentation": (
        "docs/CONXIAN_UNIFIED_THEORY_v2.md",
        "docs/architecture/SOVEREIGN_REPR_2026.md",
        "docs/architecture/ALIGNMENT.md",
        "docs/architecture/SYNERGY.md",
        "docs/REPOSITORY_TAXONOMY.md",
        "docs/WHITEPAPER.md",
        "docs/architecture/ARCHITECTURE_MODEL.md",
        "docs/architecture/CONTROL_ASSURANCE_MAPPING.md",
        "docs/architecture/SYSTEM_GRAPH.md",
        "docs/architecture/FULL_STACK_BITCOIN_RESEARCH.md",
        "docs/architecture/SDKS_AND_VERSIONING.md",
    ),
    "governance policy": (
        "CODEOWNERS",
        "SECURITY.md",
        "CONTRIBUTING.md",
        "REVIEWS.md",
        "RELEASING.md",
        "RELEASE_POLICY.md",
        "RELEASE_CONTROL.md",
        "docs/REPO_BOUNDARY_CONTRACT_V1.md",
        "docs/PRODUCTION_BOUNDARY.md",
        ".github/ORG_SECURITY_GOVERNANCE.md",
        ".github/ORG_EXCEPTIONS.md",
    ),
}

REFERENCE_DEFINITION_RE = re.compile(
    r"^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]+)>|(\S+))"
)
INLINE_LINK_START_RE = re.compile(r"!?\[[^\]\n]*\]\(")
FENCE_RE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
PLACEHOLDER_RE = re.compile(
    r"\{\{[^}]+\}\}|\$\{[^}]+\}|%\{[^}]+\}|\{[^}/]+\}|<[^>]+>|\*"
)


@dataclass(frozen=True)
class Link:
    line: int
    target: str


@dataclass(frozen=True)
class Diagnostic:
    path: Path
    line: int
    message: str

    def render(self, root: Path) -> str:
        return f"{self.path.relative_to(root).as_posix()}:{self.line}: {self.message}"


def is_historical(path: Path, root: Path) -> bool:
    try:
        parts = path.relative_to(root).parts
    except ValueError:
        return False
    return any(parts[: len(prefix)] == prefix for prefix in HISTORICAL_PREFIXES)


def is_allowed_historical_link(source: Path, target: Path, root: Path) -> bool:
    source_relative = source.relative_to(root).as_posix()
    allowed_prefixes = HISTORICAL_LINK_EXCEPTIONS.get(source_relative, ())
    target_parts = target.relative_to(root).parts
    return target_parts in allowed_prefixes


def is_excluded_source(path: Path, root: Path) -> bool:
    relative = path.relative_to(root)
    if any(part in EXCLUDED_DIRECTORY_NAMES for part in relative.parts):
        return True
    return is_historical(path, root)


def active_markdown_files(root: Path) -> list[Path]:
    return sorted(
        path
        for path in root.rglob("*.md")
        if path.is_file() and not is_excluded_source(path, root)
    )


def strip_fenced_code(lines: list[str]) -> list[str]:
    """Blank fenced code while preserving source line numbers."""
    result: list[str] = []
    fence_character: str | None = None
    fence_length = 0

    for line in lines:
        match = FENCE_RE.match(line)
        if fence_character is None:
            if match:
                marker = match.group(1)
                fence_character = marker[0]
                fence_length = len(marker)
                result.append("")
            else:
                result.append(line)
            continue

        result.append("")
        if match:
            marker = match.group(1)
            if marker[0] == fence_character and len(marker) >= fence_length:
                fence_character = None
                fence_length = 0

    return result


def _destination(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("<") and ">" in raw:
        return raw[1 : raw.index(">")].strip()

    escaped = False
    for index, character in enumerate(raw):
        if escaped:
            escaped = False
        elif character == "\\":
            escaped = True
        elif character.isspace():
            return raw[:index]
    return raw


def _inline_links(line: str, line_number: int) -> list[Link]:
    links: list[Link] = []
    search_from = 0
    while match := INLINE_LINK_START_RE.search(line, search_from):
        start = match.end()
        depth = 1
        escaped = False
        end = start
        while end < len(line):
            character = line[end]
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == "(":
                depth += 1
            elif character == ")":
                depth -= 1
                if depth == 0:
                    break
            end += 1

        if depth != 0:
            search_from = match.end()
            continue

        target = _destination(line[start:end])
        if target:
            links.append(Link(line_number, target))
        search_from = end + 1
    return links


def extract_links(text: str) -> list[Link]:
    lines = strip_fenced_code(text.splitlines())
    links: list[Link] = []
    for line_number, line in enumerate(lines, start=1):
        reference = REFERENCE_DEFINITION_RE.match(line)
        if reference:
            target = reference.group(1) or reference.group(2)
            if target:
                links.append(Link(line_number, target))
        links.extend(_inline_links(line, line_number))
    return links


def should_ignore_target(target: str) -> bool:
    target = target.strip()
    if not target or target.startswith(("#", "//", "/")):
        return True
    if PLACEHOLDER_RE.search(target):
        return True
    return bool(urlsplit(target).scheme)


def resolve_local_target(source: Path, target: str, root: Path) -> Path | None:
    if should_ignore_target(target):
        return None
    path_text = unquote(urlsplit(target).path).replace("\\", "/")
    if not path_text:
        return None
    return (source.parent / path_text).resolve(strict=False)


def validate(root: Path) -> list[Diagnostic]:
    root = root.resolve()
    diagnostics: list[Diagnostic] = []

    for source_label, paths in REQUIRED_ENTRY_PATHS.items():
        for relative_path in paths:
            candidate = root / relative_path
            if not candidate.exists():
                diagnostics.append(
                    Diagnostic(
                        root / "AGENTS.md",
                        1,
                        f"missing {source_label} entry point: {relative_path}",
                    )
                )

    for source in active_markdown_files(root):
        for link in extract_links(source.read_text(encoding="utf-8")):
            target = resolve_local_target(source, link.target, root)
            if target is None:
                continue
            try:
                target.relative_to(root)
            except ValueError:
                diagnostics.append(
                    Diagnostic(source, link.line, f"local link escapes repository: {link.target}")
                )
                continue
            if is_historical(target, root) and not is_allowed_historical_link(
                source, target, root
            ):
                diagnostics.append(
                    Diagnostic(
                        source,
                        link.line,
                        f"active documentation links to historical content: {link.target}",
                    )
                )
            elif not target.exists():
                diagnostics.append(
                    Diagnostic(source, link.line, f"missing local link target: {link.target}")
                )

    return sorted(diagnostics, key=lambda item: (str(item.path), item.line, item.message))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="repository root (defaults to the parent of scripts/)",
    )
    args = parser.parse_args(argv)

    diagnostics = validate(args.root)
    if diagnostics:
        for diagnostic in diagnostics:
            print(diagnostic.render(args.root.resolve()))
        print(f"documentation validation failed with {len(diagnostics)} error(s)")
        return 1

    print(f"documentation validation passed ({len(active_markdown_files(args.root.resolve()))} active Markdown files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
