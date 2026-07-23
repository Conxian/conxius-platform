#!/usr/bin/env python3

from __future__ import annotations

import re
import unittest
from pathlib import Path

from verify_contamination_guard import is_scanned_prod_boundary_file, scan_content


class ContaminationGuardSelfTest(unittest.TestCase):
    def test_allows_checked_in_unavailable_construction(self) -> None:
        content = """
        export const bridge = new ZKCPBridge(
          new UnavailableZKVerifier(),
          new UnavailableOnChainMonitor(),
        );
        """
        self.assertEqual(scan_content("services/admin-dashboard/src/lib/support/zkcp.ts", content), [])

    def test_rejects_multiline_non_authoritative_bridge_construction(self) -> None:
        content = """
        export const bridge = new ZKCPBridge(
          verifier,
          monitor,
          releaser,
        );
        """
        rules = {finding.rule for finding in scan_content("services/admin-dashboard/src/lib/support/zkcp.ts", content)}
        self.assertIn("production-bridge-construction", rules)

    def test_rejects_simulator_alias_and_fixture_import(self) -> None:
        content = """
        import {
          DeterministicFixtureVerifier as ProductionVerifier,
        } from "../../tests/fixtures/verifierFixtures";
        const DefaultVerifier = ProductionVerifier;
        """
        rules = {finding.rule for finding in scan_content("services/admin-dashboard/src/lib/support/bitvm.ts", content)}
        self.assertIn("production-fixture-import", rules)
        self.assertIn("production-simulator-construction", rules)

    def test_excludes_test_fixture_paths_from_production_scope(self) -> None:
        self.assertFalse(is_scanned_prod_boundary_file("services/admin-dashboard/src/tests/fixtures/example.ts"))

    def test_powerShell_rule_text_matches_canonical_bridge_fixture_contract(self) -> None:
        """Statically compare the checked-in PowerShell rule to Python fixtures.

        This intentionally does not execute PowerShell. It verifies that the
        rule text contains the same unavailable ZKCP allow-list tokens and the
        simulator/fixture rejection rule identifiers used by the Python guard.
        """
        powershell = (Path(__file__).resolve().parents[1] / "scripts" / "verify_contamination_guard.ps1").read_text("utf-8")
        self.assertIn(r"new\s+ZKCPBridge\s*\((?!", powershell)
        self.assertIn(r"new\s+UnavailableZKVerifier\s*\(\s*\)", powershell)
        self.assertIn(r"new\s+UnavailableOnChainMonitor\s*\(\s*\)", powershell)
        self.assertIn('Id = "production-simulator-construction"', powershell)
        self.assertIn('Id = "production-fixture-import"', powershell)
        self.assertIn('Id = "production-key-release-adapter"', powershell)
        self.assertIn('Id = "production-key-release-output"', powershell)
        self.assertIn('Id = "production-key-release-dispatch"', powershell)
        self.assertNotIn(r"\s*\)))' }", powershell)

        # PowerShell is not available in this environment. Normalize the
        # checked-in single-quoted regex literals for Python's regex engine and
        # statically exercise the same allow-list/alias cases instead.
        patterns = re.findall(
            r'Id = "production-bridge-construction"; Pattern = \'([^\']+)\'',
            powershell,
        )
        self.assertEqual(len(patterns), 3)
        normalized = [re.compile(pattern.replace("\\\\", "\\")) for pattern in patterns]
        fixtures = [
            ("new BitVMBridge(new UnavailableBitVMVerifier())", False),
            ("new BitVMBridge(new DefaultBitVMVerifier())", True),
            ("new BitVM3Orchestrator(new UnavailableBitVM3Verifier())", False),
            ("new BitVM3Orchestrator(new SimulatedBitVM3Verifier())", True),
            (
                "new ZKCPBridge(\n"
                "  new UnavailableZKVerifier(),\n"
                "  new UnavailableOnChainMonitor(),\n"
                ")",
                False,
            ),
            (
                "new ZKCPBridge(new DefaultZKVerifier(), "
                "new UnavailableOnChainMonitor())",
                True,
            ),
        ]
        for fixture, should_match in fixtures:
            matches = any(pattern.search(fixture) for pattern in normalized)
            self.assertEqual(matches, should_match, fixture)


if __name__ == "__main__":
    unittest.main()
