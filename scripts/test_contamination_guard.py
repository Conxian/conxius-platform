#!/usr/bin/env python3

from __future__ import annotations

import unittest

from verify_contamination_guard import is_scanned_prod_boundary_file, scan_content


class ContaminationGuardSelfTest(unittest.TestCase):
    def test_allows_checked_in_unavailable_construction(self) -> None:
        content = """
        export const bridge = new ZKCPBridge(
          new UnavailableZKVerifier(),
          new UnavailableOnChainMonitor(),
          new UnavailableDecryptionKeyReleaser(),
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


if __name__ == "__main__":
    unittest.main()
