import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { collectAnchors, isInScope, validateMarkdownLinks } from "./check-markdown-links.mjs";

function fixture(files) {
  const root = mkdtempSync(path.join(tmpdir(), "conxian-doc-links-"));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

test("accepts files, images, references, encoded paths, anchors, and external URLs", () => {
  const root = fixture({
    "README.md": [
      "[Guide](docs/Guide%20One.md#details)",
      "[Guide query](docs/Guide%20One.md?mode=local#details)",
      "![Mark](docs/mark.svg)",
      "[Reference][guide]",
      "[External](https://example.com/missing)",
      "[guide]: <docs/Guide%20One.md#details>",
    ].join("\n"),
    "docs/Guide One.md": "# Guide\n\n## Details\n",
    "docs/mark.svg": "<svg />",
  });
  const result = validateMarkdownLinks({ root, files: ["README.md", "docs/Guide One.md"] });
  assert.deepEqual(result.errors, []);
});

test("reports missing files and missing anchors with source lines", () => {
  const root = fixture({
    "README.md": "[Missing](docs/nope.md)\n[Anchor](docs/guide.md#absent)\n",
    "docs/guide.md": "# Present\n",
  });
  const result = validateMarkdownLinks({ root, files: ["README.md", "docs/guide.md"] });
  assert.equal(result.errors.length, 2);
  assert.deepEqual(result.errors.map(({ line }) => line), [1, 2]);
  assert.match(result.errors[0].reason, /missing local target/);
  assert.match(result.errors[1].reason, /missing anchor/);
});

test("excludes archives and the immutable AGENTS session log", () => {
  assert.equal(isInScope("docs/archived-reports/old.md"), false);
  assert.equal(isInScope("openspec/changes/archive/old/proposal.md"), false);
  const root = fixture({
    "AGENTS.md": "# Agents\n\n[Valid](docs/current.md)\n\n## Session Log\n[Historical](missing.md)\n",
    "docs/current.md": "# Current\n",
    "docs/archived-reports/old.md": "[Broken](missing.md)\n",
  });
  const result = validateMarkdownLinks({
    root,
    files: ["AGENTS.md", "docs/current.md", "docs/archived-reports/old.md"],
  });
  assert.deepEqual(result.errors, []);
});

test("generates deterministic duplicate GitHub-style heading anchors", () => {
  assert.deepEqual(
    [...collectAnchors("# Hello, World!\n\n## Hello World\n")],
    ["hello-world", "hello-world-1"],
  );
});
