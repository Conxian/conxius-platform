#!/usr/bin/env python3

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


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
            r"\b(?:class\s+Default\w*(?:Verifier|Monitor)|new\s+Default\w*(?:Verifier|Monitor)|"
            r"new\s+\w*(?:Simulator|Simulation)\s*\(|new\s+(?:BitVMBridge|BitVM3Orchestrator|ZKCPBridge)\s*\(\s*\))"
        ),
    ),
    (
        "synthetic-decryption-key",
        re.compile(
            r"(?:key-\$\{|(?:decryptionKey|decryption_key)\s*[:=]\s*[`\"'](?:key-|synthetic|fake|dummy))"
        ),
    ),
]

SETTLEMENT_RULES: list[tuple[str, re.Pattern[str]]] = [
    (
        "settlement-success-default",
        re.compile(r"\b(?:success\s*:\s*true|status\s*:\s*[\"'](?:idle|success|ok)[\"'])"),
    ),
]


def scan_file(rel_path: str) -> list[Finding]:
    abs_path = REPO_ROOT / rel_path
    try:
        content = abs_path.read_text("utf-8")
    except UnicodeDecodeError:
        return []

    findings: list[Finding] = []
    for idx, line in enumerate(content.splitlines(), start=1):
        rules = list(RULES)
        if VERIFIER_PATH.fullmatch(rel_path):
            rules.extend(VERIFIER_RULES)
        if SETTLEMENT_PATH.fullmatch(rel_path):
            rules.extend(SETTLEMENT_RULES)

        for rule_id, pattern in rules:
            if pattern.search(line):
                findings.append(
                    Finding(
                        path=rel_path,
                        rule=rule_id,
                        line=idx,
                        snippet=line.strip()[:200],
                    )
                )

    return findings


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
