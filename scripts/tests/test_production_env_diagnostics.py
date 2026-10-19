"""Black-box environment preflight checks; fixture values are not credentials."""
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "validate-production-env.sh"
VALID = "NODE_ENV=production\nCORE_BITCOIN_NETWORK=mainnet\n"


class ProductionEnvironmentDiagnosticsTests(unittest.TestCase):
    def run_preflight(self, content):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "fixture.env"
            if content is not None:
                target.write_text(content)
            return subprocess.run(
                ["bash", str(SCRIPT), str(target)], capture_output=True, text=True,
                timeout=5,
            )

    def test_valid_template_passes_without_values(self):
        marker = "fixture-value-must-stay-private"
        result = self.run_preflight(VALID + "OTHER_VALUE=" + marker + "\n")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn(marker, result.stdout + result.stderr)

    def test_invalid_node_environment_is_withheld(self):
        marker = "fixture-private-node-value"
        result = self.run_preflight(VALID.replace("production", marker))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("NODE_ENV", result.stdout)
        self.assertNotIn(marker, result.stdout + result.stderr)

    def test_invalid_bitcoin_network_is_withheld(self):
        marker = "fixture-private-network-value"
        result = self.run_preflight(VALID.replace("mainnet", marker))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("CORE_BITCOIN_NETWORK", result.stdout)
        self.assertNotIn(marker, result.stdout + result.stderr)

    def test_forbidden_values_report_names_without_values(self):
        for forbidden in ("development", "testnet"):
            with self.subTest(forbidden=forbidden):
                marker = "fixture-private-" + forbidden + "-suffix"
                result = self.run_preflight(VALID + "PRIVATE_SETTING=" + marker + "\n")
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("3:PRIVATE_SETTING=[redacted]", result.stdout)
                self.assertNotIn(marker, result.stdout + result.stderr)

    def test_missing_file_fails(self):
        result = self.run_preflight(None)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("not found", result.stdout)

    def test_multiple_matches_all_remain_redacted(self):
        result = self.run_preflight(
            VALID + "FIRST=fixture-one-testnet-secret\nSECOND=fixture-two-testnet-secret\n"
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("3:FIRST=[redacted]", result.stdout)
        self.assertIn("4:SECOND=[redacted]", result.stdout)
        self.assertNotIn("fixture-one", result.stdout + result.stderr)
        self.assertNotIn("fixture-two", result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
