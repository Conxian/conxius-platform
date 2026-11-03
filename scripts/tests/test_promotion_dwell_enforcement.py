from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/branch-promotion-policy.yml"


class PromotionDwellWorkflowTests(unittest.TestCase):
    def test_main_pr_policy_fetches_metadata_and_enforces_dwell(self) -> None:
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("github.event.pull_request.base.ref == 'main'", workflow)
        self.assertIn('git fetch --no-tags --depth=2 origin "$SOURCE_SHA"', workflow)
        self.assertIn("bash scripts/validate_staged_dwell.sh", workflow)
        self.assertIn("grep -qx 'eligible=true'", workflow)
        self.assertIn("Exact staged-entry dwell is incomplete", workflow)
        self.assertIn("MIN_MAINNET_DWELL_HOURS", workflow)
        self.assertLess(
            workflow.index("Enforce exact route and evidence matrix"),
            workflow.index("Enforce immutable staged dwell on main promotions"),
        )


if __name__ == "__main__":
    unittest.main()
