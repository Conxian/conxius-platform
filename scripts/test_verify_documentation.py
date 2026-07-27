from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from verify_documentation import extract_links, resolve_local_target, validate


class DocumentationParserTests(unittest.TestCase):
    def test_ignores_fenced_code_but_keeps_real_links(self) -> None:
        text = """[real](docs/guide.md)
```markdown
[example](missing.md)
```
"""
        self.assertEqual(
            [(link.line, link.target) for link in extract_links(text)],
            [(1, "docs/guide.md")],
        )

    def test_extracts_reference_and_parenthesized_targets(self) -> None:
        text = """[guide]: <docs/Guide%20One.md#start>
[inline](docs/design_(draft).md "title")
"""
        self.assertEqual(
            [(link.line, link.target) for link in extract_links(text)],
            [(1, "docs/Guide%20One.md#start"), (2, "docs/design_(draft).md")],
        )

    def test_resolver_strips_fragment_and_decodes_path(self) -> None:
        root = Path("/repo")
        source = root / "docs" / "README.md"
        self.assertEqual(
            resolve_local_target(source, "Guide%20One.md?view=1#start", root),
            root / "docs" / "Guide One.md",
        )

    def test_resolver_ignores_external_anchor_route_and_placeholder(self) -> None:
        root = Path("/repo")
        source = root / "README.md"
        targets = (
            "https://example.com/docs",
            "mailto:docs@example.com",
            "#section",
            "/application/route",
            "docs/${VERSION}/guide.md",
            "docs/{version}/guide.md",
        )
        self.assertTrue(all(resolve_local_target(source, target, root) is None for target in targets))


class DocumentationValidationTests(unittest.TestCase):
    def _write_required_entries(self, root: Path) -> None:
        from verify_documentation import REQUIRED_ENTRY_PATHS

        for paths in REQUIRED_ENTRY_PATHS.values():
            for relative_path in paths:
                path = root / relative_path
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("entry\n", encoding="utf-8")

    def test_reports_missing_and_historical_targets_but_not_archived_sources(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "archived-reports").mkdir(parents=True)
            (root / "docs" / "archived-reports" / "old.md").write_text(
                "[ignored](missing.md)\n", encoding="utf-8"
            )
            (root / "README.md").write_text(
                "[missing](docs/missing.md)\n[old](docs/archived-reports/old.md)\n",
                encoding="utf-8",
            )

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(len(messages), 2)
            self.assertTrue(any("missing local link target" in message for message in messages))
            self.assertTrue(any("links to historical content" in message for message in messages))

    def test_allows_governance_to_declare_historical_roots(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "archived-reports").mkdir(parents=True)
            (root / "GOVERNANCE.md").write_text(
                "[Historical reports](./docs/archived-reports/)\n", encoding="utf-8"
            )

            self.assertEqual(validate(root), [])


if __name__ == "__main__":
    unittest.main()
