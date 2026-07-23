#!/usr/bin/env python3

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Finding:
    path: str
    rule: str
    line: int
    snippet: str


def git_ls_files() -> list[str]:
    out = subprocess.check_output(["git", "ls-files", "-z"], cwd=REPO_ROOT)
    return [p for p in out.decode("utf-8").split("\0") if p]


def is_scanned_prod_boundary_file(path: str) -> bool:
    if path.startswith("services/admin-dashboard/src/tests/"):
        return False

    if path.startswith("services/admin-dashboard/"):
        return path.endswith((".ts", ".tsx", ".js", ".jsx"))

    if path == "scripts/provision-secrets.sh":
        return True

    return False


RULES: list[tuple[str, re.Pattern[str]]] = [
    ("stub-marker", re.compile(r"\[STUB\]")),
    ("localhost-url", re.compile(r"http://localhost|127\.0\.0\.1")),
    (
        "simulated-operational-status",
        re.compile(r'status\s*[:=]\s*"Operational"'),
    ),
    ("stub-json-reference", re.compile(r"\.stub\.json")),
]

VERIFIER_PATH = re.compile(
    r"^services/admin-dashboard/src/lib/support/(?:bitvm|bitvm3|zkcp)\.ts$"
)
SETTLEMENT_PATH = re.compile(
    r"^services/admin-dashboard/src/app/api/v1/settlement-engine/route\.ts$"
)

VERIFIER_RULES: list[tuple[str, re.Pattern[str]]] = [
    (
        "unconditional-verifier-success",
        re.compile(r"\b(?:verified|isVerified)\s*[:=]\s*true\b"),
    ),
    (
        "proof-length-predicate",
        re.compile(r"\b(?:proof|rawProof)\s*\.length\s*(?:===|!==|>=|<=|>|<)"),
    ),
    (
        "production-simulator-construction",
        re.compile(
            r"\b(?:class\s+Default\w*(?:Verifier|Monitor|Releaser|Backend)"
            r"|new\s+Default\w*(?:Verifier|Monitor|Releaser|Backend)"
            r"|new\s+\w*(?:Simulator|Simulation|Fixture|Mock|Fake|Dummy)\w*\s*\()"
            r"|\b(?:const|let|var)\s+\w*(?:Verifier|Monitor|Releaser|Backend)\w*\s*=\s*"
            r"(?:new\s+)?(?:Default\w*(?:Verifier|Monitor|Releaser|Backend)|\w*(?:Simulator|Simulation|Fixture|Mock|Fake|Dummy)\w*)"
            r"|\b(?:const|let|var)\s+Default\w*(?:Verifier|Monitor|Releaser|Backend)\w*\s*=\s*\w+"
        ),
    ),
    (
        "production-fixture-import",
        re.compile(r"(?:from\s*|import\s*)[\"'][^\"']*(?:src/tests|tests/fixtures)[^\"']*[\"']"),
    ),
    (
        "synthetic-decryption-key",
        re.compile(
            r"(?:key-\$\{|(?:decryptionKey|decryption_key)\s*[:=]\s*[`\"'](?:key-|synthetic|fake|dummy))"
        ),
    ),
    (
        "production-key-release-adapter",
        re.compile(
            r"\b(?:DecryptionKeyReleaser|UnavailableDecryptionKeyReleaser|"
            r"keyReleaser|keyRelease(?:Registry|Evidence|Attempts|Request)|"
            r"deriveZKCPKeyRelease|buildKeyReleaseRequest)\b"
        ),
    ),
    (
        "production-key-release-output",
        re.compile(r"\bdecryptionKey\b|\bstatus\s*[:=]\s*[\"']finalized[\"']"),
    ),
    (
        "production-key-release-dispatch",
        re.compile(
            r"\b(?:getByObligationId|releaseDecryptionKey)\s*\(|"
            r"\bkeyReleaser\s*\.\s*(?:getByObligationId|release)\s*\("
        ),
    ),
]

SETTLEMENT_RULES: list[tuple[str, re.Pattern[str]]] = [
    (
        "settlement-success-default",
        re.compile(r"\b(?:success\s*:\s*true|status\s*:\s*[\"'](?:idle|success|ok)[\"'])"),
    ),
    (
        "settlement-zkcp-finalize-dispatch",
        re.compile(r"\bzkcpBridge\s*\.\s*finalizeSettlement\s*\("),
    ),
]


def _line_number(content: str, index: int) -> int:
    return content.count("\n", 0, index) + 1


def _snippet(content: str, start: int, end: int) -> str:
    value = " ".join(content[start:end].strip().split())
    return value[:200]


def _bridge_construction_findings(rel_path: str, content: str) -> Iterable[Finding]:
    if not VERIFIER_PATH.fullmatch(rel_path):
        return

    allowed = {
        "BitVMBridge": re.compile(r"new\s+UnavailableBitVMVerifier\s*\(\s*\)\s*"),
        "BitVM3Orchestrator": re.compile(r"new\s+UnavailableBitVM3Verifier\s*\(\s*\)\s*"),
        "ZKCPBridge": re.compile(
            r"new\s+UnavailableZKVerifier\s*\(\s*\)\s*,\s*"
            r"new\s+UnavailableOnChainMonitor\s*\(\s*\)\s*,?\s*"
        ),
    }
    construction = re.compile(r"new\s+(BitVMBridge|BitVM3Orchestrator|ZKCPBridge)\s*\(", re.DOTALL)
    for match in construction.finditer(content):
        class_name = match.group(1)
        open_index = content.find("(", match.start(), match.end())
        depth = 0
        quote: str | None = None
        escaped = False
        close_index = len(content)
        for index in range(open_index, len(content)):
            char = content[index]
            if quote is not None:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == quote:
                    quote = None
                continue
            if char in ("'", '"', "`"):
                quote = char
                continue
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
                if depth == 0:
                    close_index = index
                    break

        body = content[open_index + 1:close_index]
        normalized = re.sub(r"\s+", " ", body).strip()
        if not allowed[class_name].fullmatch(normalized):
            yield Finding(
                path=rel_path,
                rule="production-bridge-construction",
                line=_line_number(content, match.start()),
                snippet=_snippet(content, match.start(), min(close_index + 1, match.start() + 240)),
            )
    return


def scan_content(rel_path: str, content: str) -> list[Finding]:
    rules = list(RULES)
    if VERIFIER_PATH.fullmatch(rel_path):
        rules.extend(VERIFIER_RULES)
    if SETTLEMENT_PATH.fullmatch(rel_path):
        rules.extend(SETTLEMENT_RULES)

    findings: list[Finding] = []
    for rule_id, pattern in rules:
        for match in pattern.finditer(content):
            findings.append(
                Finding(
                    path=rel_path,
                    rule=rule_id,
                    line=_line_number(content, match.start()),
                    snippet=_snippet(content, match.start(), match.end()),
                )
            )
    findings.extend(_bridge_construction_findings(rel_path, content))
    return findings


def scan_file(rel_path: str) -> list[Finding]:
    abs_path = REPO_ROOT / rel_path
    try:
        content = abs_path.read_text("utf-8")
    except UnicodeDecodeError:
        return []
    return scan_content(rel_path, content)


def main() -> int:
    tracked_files = git_ls_files()
    scanned_files = [p for p in tracked_files if is_scanned_prod_boundary_file(p)]

    all_findings: list[Finding] = []
    for path in scanned_files:
        all_findings.extend(scan_file(path))

    if all_findings:
        print("Contamination guard failed (production boundary contains forbidden patterns):\n", file=sys.stderr)
        for finding in all_findings:
            print(
                f"- {finding.path}:{finding.line} [{finding.rule}] {finding.snippet}",
                file=sys.stderr,
            )
        return 1

    print("Contamination guard passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
