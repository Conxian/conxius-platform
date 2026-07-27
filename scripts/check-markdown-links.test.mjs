import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { collectAnchors, isInScope, validateMarkdownLinks } from "./check-markdown-links.mjs";

const validator = fileURLToPath(new URL("./check-markdown-links.mjs", import.meta.url));

function fixture(t, files) {
  const root = mkdtempSync(path.join(tmpdir(), "conxian-doc-links-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

test("scope excludes history and immutable evidence but includes mutable runbooks", () => {
  assert.equal(isInScope("docs/archived-reports/old.md"), false);
  assert.equal(isInScope("openspec/changes/archive/old/proposal.md"), false);
  assert.equal(isInScope("docs/runbooks/LIFECYCLE_CONTROL_VERIFICATION_EVIDENCE.md"), false);
  assert.equal(isInScope("docs/runbooks/PHASE_3_A_S_READINESS_EVIDENCE_PACK.md"), false);
  assert.equal(isInScope("docs/runbooks/ATS_EXECUTION_REPORT_JUNE_2026.md"), false);
  assert.equal(isInScope("docs/runbooks/SIDL_RELEASE_READINESS_RUNBOOK.md"), false);
  assert.equal(isInScope("docs/runbooks/SIDL_ENDPOINT_MONITORING_RUNBOOK.md"), false);
  assert.equal(isInScope("docs/runbooks/LIFECYCLE_CONTROL_GATE_OPERATIONS.md"), true);
  assert.equal(isInScope("services/example/README.md"), true);
  assert.equal(isInScope(".agents/skills/example/SKILL.md"), true);
});

test("supports full, collapsed, shortcut, normalized reference labels, titles, and first-definition collisions", (t) => {
  const root = fixture(t, {
    "README.md": [
      "[Full][Mixed   Label]",
      "[Collapsed Label][]",
      "[Shortcut Label]",
      "[Collision][same]",
      "[mixed label]: <docs/Guide One.md#details> \"title\"",
      "[collapsed label]: docs/guide.md 'title'",
      "[shortcut label]: docs/guide.md",
      "[same]: docs/guide.md",
      "[SAME]: missing.md",
    ].join("\n"),
    "docs/Guide One.md": "# Guide\n\n## Details\n",
    "docs/guide.md": "# Guide\n",
  });
  const result = validateMarkdownLinks({ root, files: ["README.md", "docs/Guide One.md", "docs/guide.md"] });
  assert.deepEqual(result.errors, []);
  assert.equal(result.checkedLinks, 4);
});

test("reports unresolved references without double-treating images, definitions, escaped syntax, or inline links as references", (t) => {
  const root = fixture(t, {
    "README.md": [
      "[Broken][missing]",
      "[Also Broken][]",
      "![Image][image]",
      "\\[Escaped][missing-escaped]",
      "[Inline](docs/guide.md)",
      "[definition]: missing.md",
      "[image]: docs/mark.svg",
    ].join("\n"),
    "docs/guide.md": "# Guide\n",
    "docs/mark.svg": "<svg />\n",
  });
  const result = validateMarkdownLinks({ root, files: ["README.md", "docs/guide.md"] });
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors.every(({ reason }) => reason.startsWith("unresolved reference")));
});

test("fails safely on malformed or unterminated inline link destinations", (t) => {
  const root = fixture(t, { "README.md": "[Broken](docs/guide.md\n" });
  const result = validateMarkdownLinks({ root, files: ["README.md"] });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].reason, /malformed or unterminated/);
});

test("ignores fenced and inline fake links and fenced HTML anchors", (t) => {
  const root = fixture(t, {
    "README.md": [
      "[Real](docs/guide.md#real)",
      "`[Inline](missing-inline.md)`",
      "```md",
      "[Fenced](missing-fenced.md)",
      "<a id=\"fake\"></a>",
      "```",
    ].join("\n"),
    "docs/guide.md": "# Real\n\n```html\n<a name=\"fake\"></a>\n```\n",
  });
  const result = validateMarkdownLinks({ root, files: ["README.md", "docs/guide.md"] });
  assert.deepEqual(result.errors, []);
  assert.equal(collectAnchors("```html\n<a id=\"fake\"></a>\n```\n# Real\n").has("fake"), false);
});

test("generates GitHub-style heading anchors for formatting, HTML, Unicode, underscores, duplicates, ATX hashes, and empty headings", () => {
  const anchors = [...collectAnchors([
    "# Hello, *world*!",
    "## <span>Inline</span> `code` & punctuation!",
    "### déjà_vu 東京",
    "### [Linked heading](docs/guide.md)",
    "#### duplicate",
    "#### duplicate",
    "##### trailing hashes ###",
    "###### 😀",
    "<a name=\"legacy-anchor\"></a>",
  ].join("\n"))];
  assert.deepEqual(anchors, [
    "hello-world",
    "inline-code--punctuation",
    "déjà_vu-東京",
    "linked-heading",
    "duplicate",
    "duplicate-1",
    "trailing-hashes",
    "legacy-anchor",
  ]);
});

test("only accepts anchors from real opening HTML tags outside code", () => {
  const anchors = collectAnchors([
    "`<a id=\"inline-fake\"></a>`",
    "text id=\"prose-fake\" and name=\"also-fake\"",
    "<a id=\"real-id\"></a>",
    "<a name=\"real-name\"></a>",
    "<section id=\"section-id\"></section>",
    "<section name=\"not-an-anchor\"></section>",
  ].join("\n"));
  assert.equal(anchors.has("inline-fake"), false);
  assert.equal(anchors.has("prose-fake"), false);
  assert.equal(anchors.has("also-fake"), false);
  assert.equal(anchors.has("real-id"), true);
  assert.equal(anchors.has("real-name"), true);
  assert.equal(anchors.has("section-id"), true);
  assert.equal(anchors.has("not-an-anchor"), false);
});

test("validates real HTML anchors but rejects inline-code and prose lookalikes", (t) => {
  const root = fixture(t, {
    "README.md": [
      "[Inline fake](docs/guide.md#inline-fake)",
      "[Prose fake](docs/guide.md#prose-fake)",
      "[Real id](docs/guide.md#real-id)",
      "[Real name](docs/guide.md#real-name)",
      "[Element id](docs/guide.md#section-id)",
    ].join("\n"),
    "docs/guide.md": [
      "`<a id=\"inline-fake\"></a>`",
      "text id=\"prose-fake\"",
      "<a id=\"real-id\"></a>",
      "<a name=\"real-name\"></a>",
      "<section id=\"section-id\"></section>",
    ].join("\n"),
  });
  const result = validateMarkdownLinks({ root, files: ["README.md", "docs/guide.md"] });
  assert.equal(result.errors.length, 2);
  assert.deepEqual(result.errors.map(({ destination }) => destination), [
    "docs/guide.md#inline-fake",
    "docs/guide.md#prose-fake",
  ]);
});

test("collects Setext H1 and H2 anchors in document order with ATX duplicates", () => {
  assert.deepEqual([...collectAnchors([
    "Café *Guide* 東京",
    "================",
    "# Duplicate",
    "Duplicate",
    "---------",
    "## Duplicate",
    "`Code id=\"fake\"`",
    "----------------",
    "```md",
    "Fenced Heading",
    "==============",
    "```",
  ].join("\n"))], [
    "café-guide-東京",
    "duplicate",
    "duplicate-1",
    "duplicate-2",
  ]);
});

test("validates fragments for Setext headings and mixed duplicate suffixes", (t) => {
  const root = fixture(t, {
    "README.md": [
      "[H1](docs/guide.md#primary-guide)",
      "[H2](docs/guide.md#details)",
      "[Mixed duplicate](docs/guide.md#repeat-2)",
    ].join("\n"),
    "docs/guide.md": [
      "Primary Guide",
      "=============",
      "Details",
      "-------",
      "# Repeat",
      "Repeat",
      "------",
      "## Repeat",
    ].join("\n"),
  });
  assert.deepEqual(validateMarkdownLinks({ root, files: ["README.md", "docs/guide.md"] }).errors, []);
});

test("does not misclassify adjacent numeric citations as unresolved references", (t) => {
  const root = fixture(t, { "README.md": "Research claim [1][2]\n" });
  assert.deepEqual(validateMarkdownLinks({ root, files: ["README.md"] }).errors, []);
});

test("validates same-file generated and HTML anchors including duplicate headings", (t) => {
  const root = fixture(t, {
    "README.md": [
      "# Name_with punctuation!",
      "## Again",
      "## Again",
      "<a name=\"legacy\"></a>",
      "[One](#name_with-punctuation)",
      "[Duplicate](#again-1)",
      "[Legacy](#legacy)",
    ].join("\n"),
  });
  assert.deepEqual(validateMarkdownLinks({ root, files: ["README.md"] }).errors, []);
});

test("treats every valid URI scheme and protocol-relative URL as external", (t) => {
  const root = fixture(t, {
    "README.md": [
      "ftp://host/path", "ssh://host/path", "git:repo", "urn:isbn:123", "magnet:?xt=x",
      "mailto:user@example.com", "tel:+1", "data:text/plain,x", "//host/path",
    ].map((destination) => `[External](${destination})`).join("\n"),
  });
  const result = validateMarkdownLinks({ root, files: ["README.md"] });
  assert.deepEqual(result.errors, []);
  assert.equal(result.checkedLinks, 0);
});

test("handles encoded paths and fragments, angle destinations with spaces/titles, nested and escaped parentheses, root-relative links, and queries", (t) => {
  const root = fixture(t, {
    "README.md": [
      "[Encoded](docs/Guide%20One.md#caf%C3%A9)",
      "[Angle](<docs/Guide One.md#café> \"title\")",
      "[Nested](docs/a_(b).md)",
      "[Escaped](docs/a_\\(b\\).md)",
      "[Root](/docs/Guide%20One.md?mode=local#caf%C3%A9)",
    ].join("\n"),
    "docs/Guide One.md": "# Café\n",
    "docs/a_(b).md": "# Parentheses\n",
  });
  assert.deepEqual(validateMarkdownLinks({ root, files: ["README.md", "docs/Guide One.md", "docs/a_(b).md"] }).errors, []);
});

test("reports malformed encoding, path traversal, missing files, and missing anchors with source lines", (t) => {
  const root = fixture(t, {
    "README.md": [
      "[Encoding](docs/%ZZ.md)",
      "[Traversal](../outside.md)",
      "[Missing](docs/nope.md)",
      "[Anchor](docs/guide.md#absent)",
    ].join("\n"),
    "docs/guide.md": "# Present\n",
  });
  const result = validateMarkdownLinks({ root, files: ["README.md", "docs/guide.md"] });
  assert.deepEqual(result.errors.map(({ line }) => line), [1, 2, 3, 4]);
  assert.match(result.errors[0].reason, /invalid URL encoding/);
  assert.match(result.errors[1].reason, /escapes repository root/);
  assert.match(result.errors[2].reason, /missing local target/);
  assert.match(result.errors[3].reason, /missing anchor/);
});

test("accepts directory targets and resolves directory fragments through README.md", (t) => {
  const root = fixture(t, {
    "README.md": "[Directory](docs/guide/)\n[Directory anchor](docs/guide/#details)\n",
    "docs/guide/README.md": "# Guide\n\n## Details\n",
  });
  assert.deepEqual(validateMarkdownLinks({ root, files: ["README.md", "docs/guide/README.md"] }).errors, []);
});

test("rejects symlinks that resolve outside the repository", (t) => {
  const root = fixture(t, { "README.md": "[Escape](docs/outside.md)\n" });
  const outside = mkdtempSync(path.join(tmpdir(), "conxian-doc-outside-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(path.join(outside, "outside.md"), "# Outside\n");
  mkdirSync(path.join(root, "docs"), { recursive: true });
  try {
    symlinkSync(path.join(outside, "outside.md"), path.join(root, "docs/outside.md"));
  } catch (error) {
    t.skip(`symlinks unsupported: ${error.message}`);
    return;
  }
  const result = validateMarkdownLinks({ root, files: ["README.md"] });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0].reason, /symlink/);
});

test("excludes the immutable AGENTS session log", (t) => {
  const root = fixture(t, {
    "AGENTS.md": "# Agents\n\n[Valid](docs/current.md)\n\n## Session Log\n[Historical](missing.md)\n",
    "docs/current.md": "# Current\n",
  });
  assert.deepEqual(validateMarkdownLinks({ root, files: ["AGENTS.md", "docs/current.md"] }).errors, []);
});

test("CLI emits actionable diagnostics and exits non-zero", (t) => {
  const root = fixture(t, { "README.md": "[Missing](missing.md)\n" });
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "README.md"], { cwd: root });
  const result = spawnSync(process.execPath, [validator], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /README\.md:1: missing\.md — missing local target/);
  assert.match(result.stderr, /Markdown link check failed: 1 error/);
});
