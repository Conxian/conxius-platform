from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from verify_documentation import (  # isort: skip
    active_markdown_files,
    collect_anchors,
    extract_links,
    parse_local_destination,
    resolve_local_target,
    validate,
)


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

    def test_query_is_removed_only_before_the_fragment(self) -> None:
        path_query, error = parse_local_destination("target.md?view=full#real")
        self.assertIsNone(error)
        self.assertEqual(path_query.path_text, "target.md")
        self.assertEqual(path_query.fragment, "real")

        fragment_query, error = parse_local_destination("target.md#real?version=1")
        self.assertIsNone(error)
        self.assertEqual(fragment_query.path_text, "target.md")
        self.assertEqual(fragment_query.fragment, "real?version=1")

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
        self.assertTrue(
            all(
                resolve_local_target(source, target, root) is None for target in targets
            )
        )

    def test_extracts_full_collapsed_and_shortcut_references(self) -> None:
        text = """[Guide Label]: docs/guide.md#start
[full][  GUIDE   label ]
[collapsed][]
[shortcut]
[collapsed]: docs/collapsed.md
[shortcut]: docs/shortcut.md
[guide label]: docs/ignored-second-definition.md
"""
        self.assertEqual(
            [(link.line, link.target) for link in extract_links(text)],
            [
                (1, "docs/guide.md#start"),
                (5, "docs/collapsed.md"),
                (6, "docs/shortcut.md"),
                (2, "docs/guide.md#start"),
                (3, "docs/collapsed.md"),
                (4, "docs/shortcut.md"),
            ],
        )

    def test_ignores_inline_code_links_and_keeps_nested_destinations(self) -> None:
        text = r"""`[ignored](missing.md)` [nested](docs/a_(b\)c).md "title")
"""
        self.assertEqual(
            [(link.line, link.target, link.problem) for link in extract_links(text)],
            [(1, "docs/a_(b)c).md", None)],
        )

    def test_extracts_depth_aware_nested_labels_and_escaped_brackets(self) -> None:
        text = r"""[outer [inner]](missing.md#nope)
[escaped \[inner\]](valid.md#present)
\[literal](ignored.md)
\\[live](live.md)
"""
        self.assertEqual(
            [(link.line, link.target) for link in extract_links(text)],
            [
                (1, "missing.md#nope"),
                (2, "valid.md#present"),
                (4, "live.md"),
            ],
        )

    def test_extracts_nested_image_and_outer_link_without_collisions(self) -> None:
        text = r"""[outer ![diagram](image.png)](target.md) ![other](other.png)
[outer [inner]](another.md)
[inner]: collision.md
[outer \![literal](ignored.png)](escaped-image.md)
[outer \\![diagram](live.png)](live-image.md)
"""
        self.assertEqual(
            [(link.line, link.target) for link in extract_links(text)],
            [
                (3, "collision.md"),
                (1, "image.png"),
                (1, "target.md"),
                (1, "other.png"),
                (2, "another.md"),
                (4, "escaped-image.md"),
                (5, "live.png"),
                (5, "live-image.md"),
            ],
        )

    def test_nested_labels_preserve_reference_forms(self) -> None:
        text = """[outer [inner]][destination]
[destination]: target.md
[collapsed][]
[collapsed]: collapsed.md
[shortcut]
[shortcut]: shortcut.md
"""
        self.assertEqual(
            [(link.line, link.target) for link in extract_links(text)],
            [
                (2, "target.md"),
                (4, "collapsed.md"),
                (6, "shortcut.md"),
                (1, "target.md"),
                (3, "collapsed.md"),
                (5, "shortcut.md"),
            ],
        )

    def test_ignores_blockquoted_fences_and_keeps_following_links(self) -> None:
        text = """>   ```markdown
>   [ignored](missing.md)
>   ```
> >   ~~~~
> >   [also ignored](other-missing.md)
> >   ~~~~
[real](present.md)
"""
        self.assertEqual(
            [(link.line, link.target) for link in extract_links(text)],
            [(7, "present.md")],
        )

    def test_fence_closures_require_marker_length_and_whitespace_only(self) -> None:
        text = """````markdown
[ignored](missing.md)
~~~~
``` not-a-valid-close
[still ignored](also-missing.md)
`````
[backtick live](backtick.md)
~~~~ text
[tilde ignored](tilde-missing.md)
````
~~~
[tilde still ignored](tilde-also-missing.md)
~~~~ not-a-valid-close
[tilde yet ignored](tilde-third-missing.md)
~~~~~~\t
[tilde live](tilde.md)
"""
        self.assertEqual(
            [(link.line, link.target) for link in extract_links(text)],
            [(7, "backtick.md"), (16, "tilde.md")],
        )

    def test_nested_blockquote_fence_closure_requires_same_depth(self) -> None:
        text = (
            "> > ```markdown\n"
            "> > [ignored](missing.md)\n"
            "> ```\n"
            "> > [still ignored](also-missing.md)\n"
            "> > ````" + "   \n"
            "[live](present.md)\n"
        )
        self.assertEqual(
            [(link.line, link.target) for link in extract_links(text)],
            [(6, "present.md")],
        )

    def test_undefined_numeric_full_reference_is_reported(self) -> None:
        links = extract_links("Research claim [1][1].\n")
        self.assertEqual(len(links), 1)
        self.assertEqual(links[0].target, "[1]")
        self.assertEqual(links[0].problem, "unresolved reference label 1")

    def test_reports_malformed_inline_link(self) -> None:
        links = extract_links("[broken](docs/guide.md\n")
        self.assertEqual(len(links), 1)
        self.assertIn("unterminated", links[0].problem or "")

    def test_collects_github_style_headings_and_explicit_html_anchors(self) -> None:
        markdown = """# Héllo_world! *bold* `code` <span>inline</span> ###

Repeat
------

## Repeat
## Repeat

<section id="explicit-id"></section>
<a name='legacy-anchor'></a>
<span id=unquoted-anchor></span>
<!-- <a id="comment-anchor"></a> -->

`<a id="inline-code"></a>`
```html
<a id="fenced-code"></a>
# Not a heading
```
prose id="not-an-anchor"
"""
        anchors = collect_anchors(markdown)
        self.assertTrue(
            {
                "héllo_world-bold-code-inline",
                "repeat",
                "repeat-1",
                "repeat-2",
                "explicit-id",
                "legacy-anchor",
                "unquoted-anchor",
            }.issubset(anchors)
        )
        self.assertNotIn("inline-code", anchors)
        self.assertNotIn("fenced-code", anchors)
        self.assertNotIn("not-an-anchor", anchors)
        self.assertNotIn("comment-anchor", anchors)

    def test_parses_encoded_destination_and_rejects_malformed_percent(self) -> None:
        destination, error = parse_local_destination("Guide%20One.md#caf%C3%A9")
        self.assertIsNone(error)
        self.assertIsNotNone(destination)
        self.assertEqual(destination.path_text, "Guide One.md")
        self.assertEqual(destination.fragment, "café")

        destination, error = parse_local_destination("Guide%2.md#start")
        self.assertIsNone(destination)
        self.assertEqual(error, "invalid URL encoding in path")

        destination, error = parse_local_destination("Guide.md#bad%2")
        self.assertIsNone(destination)
        self.assertEqual(error, "invalid URL encoding in fragment")

    def test_extracts_local_images(self) -> None:
        links = extract_links("![diagram](docs/diagram%20one.png)\n")
        self.assertEqual(
            [(link.line, link.target) for link in links],
            [(1, "docs/diagram%20one.png")],
        )

    def test_generic_uri_schemes_and_protocol_relative_urls_are_ignored(self) -> None:
        for target in (
            "https://example.com",
            "mailto:test@example.com",
            "bitcoin:bc1qexample",
            "ipfs://example",
            "//cdn.example.com/file.md",
        ):
            destination, error = parse_local_destination(target)
            self.assertIsNone(destination)
            self.assertIsNone(error)


class DocumentationValidationTests(unittest.TestCase):
    def _write_required_entries(self, root: Path) -> None:
        from verify_documentation import REQUIRED_ENTRY_PATHS

        for paths in REQUIRED_ENTRY_PATHS.values():
            for relative_path in paths:
                path = root / relative_path
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("entry\n", encoding="utf-8")

    def test_discovers_markdown_extensions_case_insensitively_only(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            expected = {
                root / "root.md",
                root / "root.MD",
                root / "nested" / "guide.Md",
                root / "nested" / "other.mD",
            }
            for path in expected:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("[broken](missing.md)\n", encoding="utf-8")
            (root / "not-markdown.md.txt").write_text(
                "[ignored](missing.md)\n", encoding="utf-8"
            )

            sources, diagnostics = active_markdown_files(root)

            self.assertEqual(set(sources), expected)
            self.assertEqual(diagnostics, [])

    def test_reports_missing_and_historical_targets_but_not_archived_sources(
        self,
    ) -> None:
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
            self.assertTrue(
                any("missing local link target" in message for message in messages)
            )
            self.assertTrue(
                any("links to historical content" in message for message in messages)
            )

    def test_allows_governance_to_declare_historical_roots(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "archived-reports").mkdir(parents=True)
            (root / "GOVERNANCE.md").write_text(
                "[Historical reports](./docs/archived-reports/)\n", encoding="utf-8"
            )

            self.assertEqual(validate(root), [])

    def test_dynamic_archived_directory_is_historical_and_governance_may_declare_root(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            historical = root / "docs" / "archived-legacy"
            historical.mkdir(parents=True)
            (historical / "old.md").write_text(
                "[ignored](missing.md)\n", encoding="utf-8"
            )
            (root / "README.md").write_text(
                "[old](docs/archived-legacy/old.md)\n", encoding="utf-8"
            )
            (root / "GOVERNANCE.md").write_text(
                "[Historical root](docs/archived-legacy/)\n", encoding="utf-8"
            )

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(len(messages), 1)
            self.assertIn("links to historical content", messages[0])

    def test_governance_exception_is_limited_to_archive_root(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            historical = root / "docs" / "archived-legacy"
            historical.mkdir(parents=True)
            (historical / "old.md").write_text("old\n", encoding="utf-8")
            (root / "GOVERNANCE.md").write_text(
                "[Historical file](docs/archived-legacy/old.md)\n", encoding="utf-8"
            )

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(len(messages), 1)
            self.assertIn("links to historical content", messages[0])

    def test_rejects_active_markdown_symlink_to_historical_source(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            historical = root / "docs" / "archived-reports" / "old.md"
            historical.parent.mkdir(parents=True)
            historical.write_text("historical\n", encoding="utf-8")
            (root / "active.md").symlink_to(historical)

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(
                messages,
                ["active documentation symlink resolves to historical content"],
            )

    def test_rejects_symlinks_to_dynamic_archived_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            historical = root / "docs" / "archived-legacy" / "old.md"
            historical.parent.mkdir(parents=True)
            historical.write_text("historical\n", encoding="utf-8")
            (root / "active.md").symlink_to(historical)

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(
                messages,
                ["active documentation symlink resolves to historical content"],
            )

    def test_rejects_target_symlink_to_dynamic_archived_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            historical = root / "docs" / "archived-legacy"
            historical.mkdir(parents=True)
            (historical / "old.md").write_text("historical\n", encoding="utf-8")
            (root / "legacy").symlink_to(historical, target_is_directory=True)
            (root / "README.md").write_text("[old](legacy/old.md)\n", encoding="utf-8")

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(len(messages), 1)
            self.assertIn("links to historical content", messages[0])

    def test_rejects_active_markdown_symlink_outside_repository(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            root = workspace / "repository"
            root.mkdir()
            self._write_required_entries(root)
            outside = workspace / "repository-other" / "outside.md"
            outside.parent.mkdir()
            outside.write_text("outside\n", encoding="utf-8")
            (root / "active.md").symlink_to(outside)

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(
                messages, ["active documentation symlink escapes repository"]
            )

    def test_reports_broken_active_markdown_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "active.md").symlink_to(root / "missing.md")

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(
                messages, ["active documentation symlink cannot be resolved"]
            )

    def test_rejects_required_entry_symlink_outside_repository(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            root = workspace / "repository"
            root.mkdir()
            self._write_required_entries(root)
            manifest = root / ".agents" / "manifest.json"
            manifest.unlink()
            outside = workspace / "repository-other" / "manifest.json"
            outside.parent.mkdir()
            outside.write_text("{}\n", encoding="utf-8")
            manifest.symlink_to(outside)

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(
                messages,
                [
                    "invalid agent bootstrap entry point .agents/manifest.json: "
                    "symlink escapes repository"
                ],
            )

    def test_rejects_required_entry_symlink_to_historical_content(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            manifest = root / ".agents" / "manifest.json"
            manifest.unlink()
            historical = root / "docs" / "archived-reports" / "manifest.json"
            historical.parent.mkdir(parents=True)
            historical.write_text("{}\n", encoding="utf-8")
            manifest.symlink_to(historical)

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(
                messages,
                [
                    "invalid agent bootstrap entry point .agents/manifest.json: "
                    "symlink resolves to historical content"
                ],
            )

    def test_rejects_required_entry_symlink_to_dynamic_archived_content(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            manifest = root / ".agents" / "manifest.json"
            manifest.unlink()
            historical = root / "docs" / "archived-legacy" / "manifest.json"
            historical.parent.mkdir(parents=True)
            historical.write_text("{}\n", encoding="utf-8")
            manifest.symlink_to(historical)

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(
                messages,
                [
                    "invalid agent bootstrap entry point .agents/manifest.json: "
                    "symlink resolves to historical content"
                ],
            )

    def test_rejects_broken_required_entry_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            manifest = root / ".agents" / "manifest.json"
            manifest.unlink()
            manifest.symlink_to(root / "missing.json")

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(
                messages,
                [
                    "invalid agent bootstrap entry point .agents/manifest.json: "
                    "symlink cannot be resolved"
                ],
            )

    def test_rejects_required_entry_symlink_within_active_repository(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            manifest = root / ".agents" / "manifest.json"
            manifest.unlink()
            target = root / ".agents" / "real-manifest.json"
            target.write_text("{}\n", encoding="utf-8")
            manifest.symlink_to(target)

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(
                messages,
                [
                    "invalid agent bootstrap entry point .agents/manifest.json: "
                    "required entries must be regular files, not symlinks"
                ],
            )

    def test_accepts_ordinary_active_source_and_required_entries(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "README.md").write_text(
                "ordinary active source\n", encoding="utf-8"
            )

            self.assertEqual(validate(root), [])

    def test_validates_same_file_and_cross_file_fragments(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "target.md").write_text(
                '# Cross File\n<a id="26"></a>\n', encoding="utf-8"
            )
            (root / "README.md").write_text(
                "# Same File\n[same](#same-file)\n[cross](docs/target.md#cross-file)\n"
                "[numeric](docs/target.md#26)\n",
                encoding="utf-8",
            )

            self.assertEqual(validate(root), [])

    def test_validates_query_before_fragment_and_literal_query_in_html_id(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "target.md").write_text(
                '# Real\n<span id="real?version=1"></span>\n', encoding="utf-8"
            )
            (root / "README.md").write_text(
                "[path query](docs/target.md?view=full#real)\n"
                "[fragment query](docs/target.md#real?version=1)\n",
                encoding="utf-8",
            )

            self.assertEqual(validate(root), [])

    def test_fragment_query_is_not_truncated_to_an_existing_shorter_anchor(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "target.md").write_text("# Real\n", encoding="utf-8")
            (root / "README.md").write_text(
                "[wrong](docs/target.md#real?version=1)\n", encoding="utf-8"
            )

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(len(messages), 1)
            self.assertIn("missing local fragment #real?version=1", messages[0])

    def test_validates_nested_labels_images_and_escaped_brackets(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "target.md").write_text("# Present\n", encoding="utf-8")
            (root / "docs" / "image.png").write_bytes(b"image")
            (root / "README.md").write_text(
                "[outer [inner]](docs/target.md#present)\n"
                "[escaped \\[inner\\]](docs/target.md#present)\n"
                "[image ![diagram](docs/image.png)](docs/target.md#present)\n",
                encoding="utf-8",
            )

            self.assertEqual(validate(root), [])

    def test_broken_nested_outer_destination_is_reported(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "README.md").write_text(
                "[outer [inner]](missing.md#nope)\n", encoding="utf-8"
            )

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(len(messages), 1)
            self.assertIn("missing local link target: missing.md#nope", messages[0])

    def test_reports_missing_fragment_with_actionable_diagnostic(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "target.md").write_text("# Present\n", encoding="utf-8")
            (root / "README.md").write_text(
                "[missing](docs/target.md#absent)\n", encoding="utf-8"
            )

            diagnostics = validate(root)

            self.assertEqual(len(diagnostics), 1)
            self.assertEqual(diagnostics[0].path, root / "README.md")
            self.assertEqual(diagnostics[0].line, 1)
            self.assertIn("missing local fragment #absent", diagnostics[0].message)
            self.assertIn("docs/target.md", diagnostics[0].message)

    def test_validates_encoded_path_and_fragment(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "Guide One.md").write_text("# Café\n", encoding="utf-8")
            (root / "README.md").write_text(
                "[encoded](docs/Guide%20One.md#caf%C3%A9)\n", encoding="utf-8"
            )

            self.assertEqual(validate(root), [])

    def test_directory_fragment_resolves_through_readme(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            directory = root / "docs" / "guide"
            directory.mkdir(parents=True)
            (directory / "README.md").write_text(
                "Guide Home\n==========\n", encoding="utf-8"
            )
            (root / "README.md").write_text(
                "[guide](docs/guide/#guide-home)\n", encoding="utf-8"
            )

            self.assertEqual(validate(root), [])

    def test_reports_directory_fragment_without_readme(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "empty").mkdir(parents=True)
            (root / "README.md").write_text(
                "[empty](docs/empty/#section)\n", encoding="utf-8"
            )

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(len(messages), 1)
            self.assertIn("directory target has no README.md", messages[0])

    def test_reports_malformed_percent_and_reference_diagnostics(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "README.md").write_text(
                "[bad](docs/Guide%2.md)\n[missing][unknown label]\n",
                encoding="utf-8",
            )

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(len(messages), 2)
            self.assertTrue(
                any("invalid URL encoding in path" in message for message in messages)
            )
            self.assertTrue(
                any(
                    "unresolved reference label unknown label" in message
                    for message in messages
                )
            )

    def test_reports_undefined_numeric_reference_diagnostic(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "README.md").write_text(
                "Research claim [1][1].\n", encoding="utf-8"
            )

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertEqual(messages, ["unresolved reference label 1"])

    def test_ignores_code_lookalikes_during_validation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "README.md").write_text(
                "`[inline](missing.md)`\n```markdown\n[fenced](missing.md)\n```\n",
                encoding="utf-8",
            )

            self.assertEqual(validate(root), [])

    def test_ignores_nested_blockquote_fences_and_validates_link_after_closure(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            (root / "docs" / "present.md").write_text("# Present\n", encoding="utf-8")
            (root / "README.md").write_text(
                ">   ```markdown\n"
                ">   [ignored](missing.md)\n"
                ">   ```\n"
                "> >   ~~~~\n"
                "> >   [also ignored](other-missing.md)\n"
                "> >   ~~~~\n"
                "[real](docs/present.md#present)\n",
                encoding="utf-8",
            )

            self.assertEqual(validate(root), [])

    def test_excludes_immutable_evidence_and_agents_session_history(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self._write_required_entries(root)
            evidence = root / "docs" / "runbooks" / "CONTROL_EVIDENCE_2026.md"
            evidence.parent.mkdir(parents=True)
            evidence.write_text("[immutable](missing.md)\n", encoding="utf-8")
            agents = root / "AGENTS.md"
            agents.write_text(
                "# Active\n\n## Session Log\n[historical](missing.md)\n",
                encoding="utf-8",
            )

            self.assertEqual(validate(root), [])

    def test_rejects_target_symlink_escape(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            workspace = Path(temporary_directory)
            root = workspace / "repository"
            root.mkdir()
            self._write_required_entries(root)
            outside = workspace / "outside.md"
            outside.write_text("# Outside\n", encoding="utf-8")
            target = root / "docs" / "escape.md"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.symlink_to(outside)
            (root / "README.md").write_text(
                "[escape](docs/escape.md#outside)\n", encoding="utf-8"
            )

            messages = [diagnostic.message for diagnostic in validate(root)]

            self.assertTrue(
                any(
                    "local link target resolves outside repository through a symlink"
                    in message
                    for message in messages
                )
            )


class DocumentationWorkflowTests(unittest.TestCase):
    def _event_paths(self, event: str) -> list[str]:
        workflow = (
            Path(__file__).resolve().parents[1]
            / ".github"
            / "workflows"
            / "docs-validation.yml"
        ).read_text(encoding="utf-8")
        lines = workflow.splitlines()
        event_start = lines.index(f"  {event}:")
        paths_start = lines.index("    paths:", event_start)
        paths: list[str] = []
        for line in lines[paths_start + 1 :]:
            if not line.startswith("      - "):
                break
            paths.append(line.removeprefix("      - ").strip("'\""))
        return paths

    def test_openspec_manifests_trigger_both_events_and_secret_scan_remains(
        self,
    ) -> None:
        pattern = "openspec/**/.openspec.yaml"
        self.assertIn(pattern, self._event_paths("pull_request"))
        self.assertIn(pattern, self._event_paths("push"))

        workflow = (
            Path(__file__).resolve().parents[1]
            / ".github"
            / "workflows"
            / "docs-validation.yml"
        ).read_text(encoding="utf-8")
        self.assertIn("  secret-scan:\n", workflow)
        self.assertIn("uses: ./.github/workflows/reusable-secret-scan.yml", workflow)

    def test_all_markdown_extension_cases_trigger_both_events(self) -> None:
        patterns = {
            "*.md",
            "*.MD",
            "*.Md",
            "*.mD",
            "**/*.md",
            "**/*.MD",
            "**/*.Md",
            "**/*.mD",
        }
        for event in ("pull_request", "push"):
            self.assertTrue(patterns.issubset(set(self._event_paths(event))))


if __name__ == "__main__":
    unittest.main()
