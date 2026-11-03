from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "validate_staged_dwell.sh"


def git(repo: Path, *args: str, env: dict[str, str] | None = None) -> str:
    result = subprocess.run(
        ["git", *args], cwd=repo, env=env, check=True, text=True, capture_output=True
    )
    return result.stdout.strip()


def commit(repo: Path, name: str, epoch: int) -> str:
    (repo / name).write_text(name, encoding="utf-8")
    git(repo, "add", name)
    env = os.environ | {
        "GIT_AUTHOR_DATE": f"@{epoch} +0000",
        "GIT_COMMITTER_DATE": f"@{epoch} +0000",
    }
    git(repo, "commit", "-m", name, env=env)
    return git(repo, "rev-parse", "HEAD")


class StagedDwellTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.repo = Path(self.temp_dir.name)
        git(self.repo, "init", "-q")
        git(self.repo, "config", "user.email", "test@example.com")
        git(self.repo, "config", "user.name", "Test")
        self.base_branch = git(self.repo, "branch", "--show-current")
        self.root = commit(self.repo, "root", 1_000_000)
        git(self.repo, "checkout", "-q", "-b", "feature")
        commit(self.repo, "feature", 1_000_100)
        git(self.repo, "checkout", "-q", self.base_branch)
        env = os.environ | {
            "GIT_AUTHOR_DATE": "@1000200 +0000",
            "GIT_COMMITTER_DATE": "@1000200 +0000",
        }
        git(self.repo, "merge", "--no-ff", "feature", "-m", "staged entry", env=env)
        self.merge_sha = git(self.repo, "rev-parse", "HEAD")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def run_validator(
        self, hours: str, sha: str, now: int
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["bash", str(SCRIPT), hours, sha, str(now)],
            cwd=self.repo,
            text=True,
            capture_output=True,
        )

    def test_rejects_invalid_or_below_minimum_hours(self) -> None:
        for hours in ("", "abc", "-1", "0", "11"):
            with self.subTest(hours=hours):
                self.assertEqual(
                    self.run_validator(hours, self.merge_sha, 2_000_000).returncode, 2
                )

    def test_rejects_single_parent_staged_head(self) -> None:
        result = self.run_validator("12", self.root, 2_000_000)
        self.assertEqual(result.returncode, 4)
        self.assertIn("two-parent merge commit", result.stderr)

    def test_rejects_octopus_staged_head(self) -> None:
        git(self.repo, "checkout", "-q", "-b", "octopus-one", self.root)
        commit(self.repo, "octopus-one", 1_000_110)
        git(self.repo, "checkout", "-q", "-b", "octopus-two", self.root)
        commit(self.repo, "octopus-two", 1_000_120)
        git(self.repo, "checkout", "-q", "-b", "octopus-base", self.root)
        env = os.environ | {
            "GIT_AUTHOR_DATE": "@1000300 +0000",
            "GIT_COMMITTER_DATE": "@1000300 +0000",
        }
        git(
            self.repo,
            "merge",
            "--no-ff",
            "octopus-one",
            "octopus-two",
            "-m",
            "octopus staged entry",
            env=env,
        )
        octopus_sha = git(self.repo, "rev-parse", "HEAD")
        result = self.run_validator("12", octopus_sha, 2_000_000)
        self.assertEqual(result.returncode, 4)
        self.assertIn("two-parent merge commit", result.stderr)

    def test_reports_ineligible_before_boundary(self) -> None:
        result = self.run_validator("12", self.merge_sha, 1_000_200 + 12 * 3600 - 1)
        self.assertEqual(result.returncode, 0)
        self.assertIn("eligible=false", result.stdout)

    def test_reports_eligible_at_boundary(self) -> None:
        result = self.run_validator("12", self.merge_sha, 1_000_200 + 12 * 3600)
        self.assertEqual(result.returncode, 0)
        self.assertIn("eligible=true", result.stdout)
        self.assertIn("minimum_seconds=43200", result.stdout)

    def test_rejects_future_staged_entry(self) -> None:
        self.assertEqual(
            self.run_validator("12", self.merge_sha, 1_000_199).returncode, 5
        )


if __name__ == "__main__":
    unittest.main()
