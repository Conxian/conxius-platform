#!/usr/bin/env python3

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class ContentRule:
    path: str
    required_snippets: tuple[str, ...]


def read_text(path: Path) -> str:
    return path.read_text("utf-8")


def verify_required_files(required_files: list[str], failures: list[str]) -> None:
    for rel_path in required_files:
        abs_path = REPO_ROOT / rel_path
        if not abs_path.is_file():
            failures.append(f"Missing required file: {rel_path}")


def verify_content_rules(rules: list[ContentRule], failures: list[str]) -> None:
    for rule in rules:
        abs_path = REPO_ROOT / rule.path
        if not abs_path.is_file():
            failures.append(f"Missing required file for content checks: {rule.path}")
            continue

        content = read_text(abs_path)
        for snippet in rule.required_snippets:
            if snippet not in content:
                failures.append(
                    f"Missing required content in {rule.path}: `{snippet}`"
                )


def verify_package_script(failures: list[str]) -> None:
    package_json_path = REPO_ROOT / "package.json"
    if not package_json_path.is_file():
        failures.append("Missing package.json")
        return

    package_json = json.loads(read_text(package_json_path))
    scripts = package_json.get("scripts", {})
    actual = scripts.get("check:lifecycle-control")
    expected = "bash scripts/ci/run-lifecycle-control-gates.sh"

    if actual != expected:
        failures.append(
            "package.json scripts.check:lifecycle-control is invalid: "
            f"expected `{expected}`, got `{actual}`"
        )


def main() -> int:
    failures: list[str] = []

    required_files = [
        "openspec/changes/2026-05-28-con-698-lifecycle-control-gates/proposal.md",
        "openspec/changes/2026-05-28-con-698-lifecycle-control-gates/tasks.md",
        "openspec/changes/2026-05-28-con-698-lifecycle-control-gates/spec-delta.md",
        "docs/architecture/CON-698_LIFECYCLE_CONTROL_DESIGN_IMPACT_REVIEW.md",
        "docs/runbooks/LIFECYCLE_CONTROL_VERIFICATION_EVIDENCE.md",
        "docs/runbooks/LIFECYCLE_CONTROL_GATE_OPERATIONS.md",
        "scripts/ci/run-lifecycle-control-gates.sh",
        "scripts/verify_lifecycle_control_gates.py",
        ".github/workflows/lifecycle-control-gates.yml",
    ]

    verify_required_files(required_files, failures)

    content_rules = [
        ContentRule(
            path="docs/architecture/CON-698_LIFECYCLE_CONTROL_DESIGN_IMPACT_REVIEW.md",
            required_snippets=(
                "Canonical operating model reference",
                "Decision",
                "Outcome",
                "Rationale",
                "DISC-1",
                "OPS-2",
            ),
        ),
        ContentRule(
            path="docs/runbooks/LIFECYCLE_CONTROL_VERIFICATION_EVIDENCE.md",
            required_snippets=(
                "test-results/lifecycle-control-gates/",
                "pnpm run check:lifecycle-control",
                "What to link in PRs/issues",
            ),
        ),
        ContentRule(
            path="docs/runbooks/LIFECYCLE_CONTROL_GATE_OPERATIONS.md",
            required_snippets=(
                "CODEOWNERS",
                "@botshelomokoka",
                "@admin-conxian-labs",
                "Escalation path",
                "Monitoring expectations",
                "Rollback plan",
            ),
        ),
        ContentRule(
            path="docs/architecture/REPO_OWNERSHIP.md",
            required_snippets=(
                "Lifecycle/control gate ownership",
                "Ownership authority source of truth",
                "@botshelomokoka",
                "@admin-conxian-labs",
                "Escalation",
            ),
        ),
        ContentRule(
            path="RELEASING.md",
            required_snippets=(
                "Lifecycle/control gate requirements",
                "check:lifecycle-control",
                "LIFECYCLE_CONTROL_GATE_OPERATIONS.md",
            ),
        ),
        ContentRule(
            path="docs/runbooks/RELEASE_CHECKLIST_TEMPLATE.md",
            required_snippets=(
                "Lifecycle/control gates (required)",
                "check:lifecycle-control",
                "lifecycle-control-gates",
            ),
        ),
        ContentRule(
            path="scripts/ci/run-lifecycle-control-gates.sh",
            required_snippets=(
                "test-results/lifecycle-control-gates",
                "python3 scripts/verify_lifecycle_control_gates.py",
                "python3 scripts/verify_bos_production_boundary.py",
                "python3 scripts/verify_submodule_integrity.py",
                "python3 scripts/verify_contamination_guard.py",
            ),
        ),
        ContentRule(
            path=".github/workflows/lifecycle-control-gates.yml",
            required_snippets=(
                "name: Lifecycle Control Gates",
                "bash scripts/ci/run-lifecycle-control-gates.sh",
                "actions/upload-artifact@v4",
                "lifecycle-control-gates",
            ),
        ),
    ]

    verify_content_rules(content_rules, failures)
    verify_package_script(failures)

    if failures:
        print("Lifecycle/control gate verification failed:\n", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("Lifecycle/control gate verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
