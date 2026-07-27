#!/usr/bin/env python3
"""Validate active repository-local Markdown links and documentation entry points."""

from __future__ import annotations

import argparse
import os
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

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

OPENSPEC_ARCHIVE_PREFIX = ("openspec", "changes", "archive")

IMMUTABLE_EVIDENCE_FILES = {
    "docs/runbooks/ATS_EXECUTION_REPORT_JUNE_2026.md",
    "docs/runbooks/BITCOIN_SANDBOX_PRODUCTION_PARITY_MATRIX.md",
    "docs/runbooks/GITHUB_PRIVATE_CONTROL_SNAPSHOT.md",
}

# GOVERNANCE.md must identify the historical roots in order to define their
# non-authoritative status. No other active source receives this exception.
HISTORICAL_LINK_EXCEPTION_SOURCE = "GOVERNANCE.md"

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

OPENING_FENCE_RE = re.compile(
    r"^(?P<blockquote>\s{0,3}(?:>\s*)*)\s{0,3}(?P<marker>`{3,}|~{3,})"
)
CLOSING_FENCE_RE = re.compile(
    r"^(?P<blockquote>\s{0,3}(?:>\s*)*)\s{0,3}(?P<marker>`{3,}|~{3,})[ \t]*$"
)
ATX_HEADING_RE = re.compile(r"^\s{0,3}#{1,6}(?:\s+|$)(.*?)\s*$")
SETEXT_RE = re.compile(r"^\s{0,3}(?:=+|-+)\s*$")
URI_SCHEME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:")
PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}|\$\{[^}]+\}|%\{[^}]+\}|\{[^}/]+\}|\*")
REFERENCE_DEFINITION_RE = re.compile(
    r"^\s{0,3}\[([^\]\n]+)\]:\s*(<[^>\n]*>|\S+)"
    r"(?:\s+(?:\"[^\"]*\"|'[^']*'|\([^)]*\)))?\s*$"
)
HTML_OPENING_TAG_RE = re.compile(r"<([A-Za-z][A-Za-z0-9:-]*)\b([^<>]*)>")
HTML_ID_RE = re.compile(
    r"(?:^|\s)id\s*=\s*(?:([\"'])(.*?)\1|([^\s\"'=<>`]+))", re.IGNORECASE
)
HTML_NAME_RE = re.compile(
    r"(?:^|\s)name\s*=\s*(?:([\"'])(.*?)\1|([^\s\"'=<>`]+))",
    re.IGNORECASE,
)
SESSION_LOG_RE = re.compile(r"^## Session Log\s*$", re.MULTILINE)


@dataclass(frozen=True)
class Link:
    line: int
    target: str
    problem: str | None = None


@dataclass(frozen=True)
class LocalDestination:
    path_text: str
    fragment: str


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
    return (
        len(parts) >= 2 and parts[0] == "docs" and parts[1].startswith("archived-")
    ) or parts[: len(OPENSPEC_ARCHIVE_PREFIX)] == OPENSPEC_ARCHIVE_PREFIX


def is_allowed_historical_link(source: Path, target: Path, root: Path) -> bool:
    source_relative = source.relative_to(root).as_posix()
    if source_relative != HISTORICAL_LINK_EXCEPTION_SOURCE:
        return False
    target_parts = target.relative_to(root).parts
    return (
        len(target_parts) == 2
        and target_parts[0] == "docs"
        and target_parts[1].startswith("archived-")
    ) or target_parts == OPENSPEC_ARCHIVE_PREFIX


def is_immutable_evidence(path: Path, root: Path) -> bool:
    relative = path.relative_to(root).as_posix()
    if relative in IMMUTABLE_EVIDENCE_FILES:
        return True
    if not relative.startswith("docs/runbooks/"):
        return False
    name = path.name
    return bool(
        re.search(r"_EVIDENCE[^/]*\.md$", name, re.IGNORECASE)
        or re.search(r"_READINESS[^/]*\.md$", name, re.IGNORECASE)
        or name.startswith("SIDL_")
    )


def is_excluded_source(path: Path, root: Path) -> bool:
    relative = path.relative_to(root)
    if any(part in EXCLUDED_DIRECTORY_NAMES for part in relative.parts):
        return True
    return is_historical(path, root) or is_immutable_evidence(path, root)


def _resolve_existing(path: Path) -> Path | None:
    try:
        return path.resolve(strict=True)
    except (OSError, RuntimeError):
        return None


def _is_within(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True


def active_markdown_files(root: Path) -> tuple[list[Path], list[Diagnostic]]:
    sources: list[Path] = []
    diagnostics: list[Diagnostic] = []

    for path in root.rglob("*"):
        if path.suffix.casefold() != ".md":
            continue
        if is_excluded_source(path, root):
            continue

        if path.is_symlink():
            resolved = _resolve_existing(path)
            if resolved is None:
                diagnostics.append(
                    Diagnostic(
                        path, 1, "active documentation symlink cannot be resolved"
                    )
                )
                continue
            if not _is_within(resolved, root):
                diagnostics.append(
                    Diagnostic(
                        path, 1, "active documentation symlink escapes repository"
                    )
                )
                continue
            if is_historical(resolved, root):
                diagnostics.append(
                    Diagnostic(
                        path,
                        1,
                        "active documentation symlink resolves to historical content",
                    )
                )
                continue
            if is_excluded_source(resolved, root):
                diagnostics.append(
                    Diagnostic(
                        path,
                        1,
                        "active documentation symlink resolves to excluded content",
                    )
                )
                continue
            if not resolved.is_file():
                diagnostics.append(
                    Diagnostic(
                        path,
                        1,
                        "active documentation symlink does not resolve to a file",
                    )
                )
                continue
        else:
            try:
                if not path.is_file():
                    continue
            except OSError:
                diagnostics.append(
                    Diagnostic(
                        path, 1, "active documentation source cannot be inspected"
                    )
                )
                continue

        sources.append(path)

    return sorted(sources), diagnostics


def strip_fenced_code(lines: list[str]) -> list[str]:
    """Blank fenced code while preserving source line numbers and widths."""
    result: list[str] = []
    fence_character: str | None = None
    fence_length = 0
    fence_blockquote_depth = 0

    for line in lines:
        if fence_character is None:
            match = OPENING_FENCE_RE.match(line)
            if match:
                marker = match.group("marker")
                fence_character = marker[0]
                fence_length = len(marker)
                fence_blockquote_depth = match.group("blockquote").count(">")
                result.append(" " * len(line))
            else:
                result.append(line)
            continue

        result.append(" " * len(line))
        match = CLOSING_FENCE_RE.match(line)
        if match:
            marker = match.group("marker")
            blockquote_depth = match.group("blockquote").count(">")
            if (
                marker[0] == fence_character
                and len(marker) >= fence_length
                and blockquote_depth == fence_blockquote_depth
            ):
                fence_character = None
                fence_length = 0
                fence_blockquote_depth = 0

    return result


def strip_inline_code(line: str, *, preserve_contents: bool = False) -> str:
    """Strip one-line code spans while preserving offsets."""
    result = list(line)
    index = 0
    while index < len(line):
        if line[index] != "`" or (index > 0 and line[index - 1] == "\\"):
            index += 1
            continue
        ticks = 1
        while index + ticks < len(line) and line[index + ticks] == "`":
            ticks += 1
        marker = "`" * ticks
        closing = line.find(marker, index + ticks)
        if closing == -1:
            index += ticks
            continue
        end = closing + ticks
        if preserve_contents:
            for offset in range(index, index + ticks):
                result[offset] = " "
            for offset in range(closing, end):
                result[offset] = " "
        else:
            for offset in range(index, end):
                result[offset] = " "
        index = end
    return "".join(result)


def visible_lines(
    text: str, *, preserve_inline_code_contents: bool = False
) -> list[str]:
    return [
        strip_inline_code(line, preserve_contents=preserve_inline_code_contents)
        for line in strip_fenced_code(text.splitlines())
    ]


def normalize_reference_label(value: str) -> str:
    return " ".join(value.split()).casefold()


def _is_escaped(line: str, index: int) -> bool:
    backslashes = 0
    index -= 1
    while index >= 0 and line[index] == "\\":
        backslashes += 1
        index -= 1
    return backslashes % 2 == 1


def _find_closing_bracket(line: str, start: int) -> int:
    depth = 0
    index = start
    while index < len(line):
        if line[index] == "\\":
            index += 2
            continue
        if line[index] == "[":
            depth += 1
        elif line[index] == "]":
            if depth == 0:
                return index
            depth -= 1
        index += 1
    return -1


def _clean_destination(raw: str) -> str | None:
    value = raw.strip()
    if not value:
        return None
    if value.startswith("<"):
        closing = value.find(">")
        if closing == -1:
            return None
        return re.sub(r"\\([<> ])", r"\1", value[1:closing])

    depth = 0
    destination: list[str] = []
    index = 0
    while index < len(value):
        character = value[index]
        if character == "\\" and index + 1 < len(value):
            destination.append(value[index + 1])
            index += 2
            continue
        if character.isspace() and depth == 0:
            break
        if character == "(":
            depth += 1
        elif character == ")" and depth > 0:
            depth -= 1
        destination.append(character)
        index += 1
    return "".join(destination) or None


def _parse_inline_destination(line: str, opening: int) -> tuple[str | None, int] | None:
    depth = 0
    angle = False
    index = opening + 1
    while index < len(line):
        character = line[index]
        if character == "\\":
            index += 2
            continue
        if character == "<" and depth == 0:
            angle = True
        elif character == ">" and angle:
            angle = False
        elif not angle and character == "(":
            depth += 1
        elif not angle and character == ")":
            if depth == 0:
                return _clean_destination(line[opening + 1 : index]), index + 1
            depth -= 1
        index += 1
    return None


def extract_links(text: str) -> list[Link]:
    lines = visible_lines(text)
    definitions: dict[str, str] = {}
    definition_lines: set[int] = set()
    links: list[Link] = []

    for line_number, line in enumerate(lines, start=1):
        match = REFERENCE_DEFINITION_RE.match(line)
        if not match:
            continue
        label = normalize_reference_label(match.group(1))
        target = _clean_destination(match.group(2))
        if label and target and label not in definitions:
            definitions[label] = target
            links.append(Link(line_number, target))
        definition_lines.add(line_number)

    def extract_line(
        line: str, line_number: int, *, images_only: bool = False
    ) -> list[Link]:
        line_links: list[Link] = []
        index = 0
        while index < len(line):
            opening = line.find("[", index)
            if opening == -1:
                break
            if images_only and (
                opening == 0
                or line[opening - 1] != "!"
                or _is_escaped(line, opening - 1)
            ):
                index = opening + 1
                continue
            if _is_escaped(line, opening):
                index = opening + 1
                continue
            text_end = _find_closing_bracket(line, opening + 1)
            if text_end == -1:
                index = opening + 1
                continue
            link_text = line[opening + 1 : text_end]
            following = line[text_end + 1 : text_end + 2]

            if following == "(":
                parsed = _parse_inline_destination(line, text_end + 1)
                if parsed is None:
                    line_links.append(
                        Link(
                            line_number,
                            "(malformed Markdown link)",
                            "malformed or unterminated inline link destination",
                        )
                    )
                    index = text_end + 2
                    continue
                target, end = parsed
                line_links.extend(
                    extract_line(link_text, line_number, images_only=True)
                )
                if target:
                    line_links.append(Link(line_number, target))
                else:
                    line_links.append(
                        Link(
                            line_number,
                            "(malformed Markdown link)",
                            "malformed or empty inline link destination",
                        )
                    )
                index = end
                continue

            if following == "[":
                label_end = _find_closing_bracket(line, text_end + 2)
                if label_end == -1:
                    line_links.append(
                        Link(
                            line_number,
                            "(malformed Markdown reference)",
                            "malformed or unterminated reference label",
                        )
                    )
                    index = text_end + 2
                    continue
                explicit_label = line[text_end + 2 : label_end]
                label = normalize_reference_label(explicit_label or link_text)
                target = definitions.get(label)
                if target:
                    line_links.extend(
                        extract_line(link_text, line_number, images_only=True)
                    )
                    line_links.append(Link(line_number, target))
                else:
                    line_links.append(
                        Link(
                            line_number,
                            f"[{label or '(empty)'}]",
                            f"unresolved reference label {label or '(empty)'}",
                        )
                    )
                index = label_end + 1
                continue

            shortcut = definitions.get(normalize_reference_label(link_text))
            if shortcut:
                line_links.append(Link(line_number, shortcut))
            index = text_end + 1

        return line_links

    for line_number, line in enumerate(lines, start=1):
        if line_number in definition_lines:
            continue
        links.extend(extract_line(line, line_number))

    return links


def _heading_text(value: str) -> str:
    value = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"<[^>]*>", "", value)
    value = re.sub(r"\\([\\`*_[\]{}()#+.!~-])", r"\1", value)
    return value.replace("`", "").replace("*", "").replace("~", "")


def github_slug(value: str) -> str:
    characters: list[str] = []
    for character in _heading_text(value).strip().lower():
        category = unicodedata.category(character)
        if character.isspace():
            characters.append("-")
        elif character in "_-" or category[0] in {"L", "N", "M"}:
            characters.append(character)
    return "".join(characters)


def collect_anchors(markdown: str) -> set[str]:
    heading_lines = strip_fenced_code(markdown.splitlines())
    html_lines = visible_lines(markdown)
    anchors: set[str] = set()
    duplicate_counts: dict[str, int] = {}

    def add_heading(value: str) -> None:
        base = github_slug(value)
        if not base:
            return
        count = duplicate_counts.get(base, 0)
        duplicate_counts[base] = count + 1
        anchors.add(base if count == 0 else f"{base}-{count}")

    for index, line in enumerate(heading_lines):
        heading = ATX_HEADING_RE.match(line)
        if heading:
            add_heading(re.sub(r"\s+#+\s*$", "", heading.group(1)))
            continue
        if index == 0 or not SETEXT_RE.match(line):
            continue
        previous = heading_lines[index - 1]
        if previous.strip() and not ATX_HEADING_RE.match(previous):
            add_heading(previous.strip())

    html_visible = re.sub(r"<!--.*?-->", "", "\n".join(html_lines), flags=re.DOTALL)
    for match in HTML_OPENING_TAG_RE.finditer(html_visible):
        tag_name = match.group(1).casefold()
        attributes = match.group(2)
        id_match = HTML_ID_RE.search(attributes)
        if id_match:
            anchors.add(id_match.group(2) or id_match.group(3))
        if tag_name == "a":
            name_match = HTML_NAME_RE.search(attributes)
            if name_match:
                anchors.add(name_match.group(2) or name_match.group(3))

    return anchors


def _decode_component(value: str, kind: str) -> tuple[str | None, str | None]:
    if re.search(r"%(?![0-9A-Fa-f]{2})", value):
        return None, f"invalid URL encoding in {kind}"
    try:
        raw = bytearray()
        index = 0
        while index < len(value):
            if value[index] == "%":
                raw.append(int(value[index + 1 : index + 3], 16))
                index += 3
            else:
                raw.extend(value[index].encode("utf-8"))
                index += 1
        return bytes(raw).decode("utf-8"), None
    except (UnicodeDecodeError, ValueError):
        return None, f"invalid URL encoding in {kind}"


def parse_local_destination(target: str) -> tuple[LocalDestination | None, str | None]:
    destination = target.strip()
    if not destination or destination.startswith("//"):
        return None, None
    if URI_SCHEME_RE.match(destination) or PLACEHOLDER_RE.search(destination):
        return None, None
    if destination.startswith("/"):
        return None, None

    before_fragment, _, raw_fragment = destination.partition("#")
    raw_path = before_fragment.partition("?")[0]
    path_text, path_error = _decode_component(raw_path, "path")
    if path_error:
        return None, path_error
    fragment, fragment_error = _decode_component(raw_fragment, "fragment")
    if fragment_error:
        return None, fragment_error
    return LocalDestination((path_text or "").replace("\\", "/"), fragment or ""), None


def should_ignore_target(target: str) -> bool:
    destination, error = parse_local_destination(target)
    return error is None and (destination is None or not destination.path_text)


def resolve_local_target(source: Path, target: str, root: Path) -> Path | None:
    destination, error = parse_local_destination(target)
    if error or destination is None or not destination.path_text:
        return None
    return Path(os.path.abspath(source.parent / destination.path_text))


def _relevant_source_text(source: Path, text: str, root: Path) -> str:
    if source.relative_to(root).as_posix() != "AGENTS.md":
        return text
    session_log = SESSION_LOG_RE.search(text)
    return text if session_log is None else text[: session_log.start()]


def _validate_required_entries(root: Path) -> list[Diagnostic]:
    diagnostics: list[Diagnostic] = []
    for source_label, paths in REQUIRED_ENTRY_PATHS.items():
        for relative_path in paths:
            candidate = root / relative_path
            resolved = _resolve_existing(candidate)
            if resolved is None:
                if candidate.is_symlink():
                    message = (
                        f"invalid {source_label} entry point {relative_path}: "
                        "symlink cannot be resolved"
                    )
                else:
                    diagnostics.append(
                        Diagnostic(
                            root / "AGENTS.md",
                            1,
                            f"missing {source_label} entry point: {relative_path}",
                        )
                    )
                    continue
            elif not _is_within(resolved, root):
                message = (
                    f"invalid {source_label} entry point {relative_path}: "
                    "symlink escapes repository"
                )
            elif is_historical(resolved, root):
                message = (
                    f"invalid {source_label} entry point {relative_path}: "
                    "symlink resolves to historical content"
                )
            elif resolved != candidate:
                message = (
                    f"invalid {source_label} entry point {relative_path}: "
                    "required entries must be regular files, not symlinks"
                )
            elif not resolved.is_file():
                message = (
                    f"invalid {source_label} entry point {relative_path}: "
                    "required entry is not a regular file"
                )
            else:
                continue
            diagnostics.append(Diagnostic(root / "AGENTS.md", 1, message))
    return diagnostics


def validate(root: Path) -> list[Diagnostic]:
    root = root.resolve()
    diagnostics = _validate_required_entries(root)
    sources, source_diagnostics = active_markdown_files(root)
    diagnostics.extend(source_diagnostics)

    for source in sources:
        try:
            source_text = source.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            diagnostics.append(
                Diagnostic(source, 1, "active documentation source cannot be read")
            )
            continue

        relevant_text = _relevant_source_text(source, source_text, root)
        for link in extract_links(relevant_text):
            if link.problem:
                diagnostics.append(Diagnostic(source, link.line, link.problem))
                continue

            destination, parse_error = parse_local_destination(link.target)
            if parse_error:
                diagnostics.append(
                    Diagnostic(
                        source,
                        link.line,
                        f"{parse_error}: {link.target}",
                    )
                )
                continue
            if destination is None:
                continue

            lexical_target = (
                source
                if not destination.path_text
                else Path(os.path.abspath(source.parent / destination.path_text))
            )
            if not _is_within(lexical_target, root):
                diagnostics.append(
                    Diagnostic(
                        source,
                        link.line,
                        f"local link escapes repository: {link.target}",
                    )
                )
                continue
            if is_historical(lexical_target, root) and not is_allowed_historical_link(
                source, lexical_target, root
            ):
                diagnostics.append(
                    Diagnostic(
                        source,
                        link.line,
                        f"active documentation links to historical content: {link.target}",
                    )
                )
                continue

            real_target = _resolve_existing(lexical_target)
            if real_target is None:
                diagnostics.append(
                    Diagnostic(
                        source, link.line, f"missing local link target: {link.target}"
                    )
                )
                continue
            if not _is_within(real_target, root):
                diagnostics.append(
                    Diagnostic(
                        source,
                        link.line,
                        f"local link target resolves outside repository through a symlink: {link.target}",
                    )
                )
                continue
            if is_historical(real_target, root) and not is_allowed_historical_link(
                source, real_target, root
            ):
                diagnostics.append(
                    Diagnostic(
                        source,
                        link.line,
                        f"active documentation links to historical content: {link.target}",
                    )
                )
                continue

            if not destination.fragment:
                continue
            anchor_target = real_target
            if anchor_target.is_dir():
                readme = anchor_target / "README.md"
                anchor_target = _resolve_existing(readme) or readme
                if not anchor_target.exists():
                    diagnostics.append(
                        Diagnostic(
                            source,
                            link.line,
                            f"directory target has no README.md for fragment validation: {link.target}",
                        )
                    )
                    continue
                if not _is_within(anchor_target, root):
                    diagnostics.append(
                        Diagnostic(
                            source,
                            link.line,
                            f"directory README resolves outside repository through a symlink: {link.target}",
                        )
                    )
                    continue
            if anchor_target.suffix.casefold() != ".md":
                continue
            try:
                anchors = collect_anchors(anchor_target.read_text(encoding="utf-8"))
            except (OSError, UnicodeError):
                diagnostics.append(
                    Diagnostic(
                        source,
                        link.line,
                        f"local fragment target cannot be read: {link.target}",
                    )
                )
                continue
            if destination.fragment not in anchors:
                target_relative = anchor_target.relative_to(root).as_posix()
                diagnostics.append(
                    Diagnostic(
                        source,
                        link.line,
                        f"missing local fragment #{destination.fragment} in {target_relative}: {link.target}",
                    )
                )

    return sorted(
        diagnostics, key=lambda item: (str(item.path), item.line, item.message)
    )


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

    sources, _ = active_markdown_files(args.root.resolve())
    print(f"documentation validation passed ({len(sources)} active Markdown files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
