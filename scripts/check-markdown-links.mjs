#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXCLUDED_PREFIXES = [
  "docs/archived-reports/",
  "docs/archived-scripts/",
  "docs/archived-tasks/",
  "openspec/changes/archive/",
];

const EXCLUDED_FILES = new Set([
  "docs/runbooks/ATS_EXECUTION_REPORT_JUNE_2026.md",
  "docs/runbooks/BITCOIN_SANDBOX_PRODUCTION_PARITY_MATRIX.md",
  "docs/runbooks/GITHUB_PRIVATE_CONTROL_SNAPSHOT.md",
]);

const EXTERNAL_SCHEMES = /^(?:https?:|mailto:|tel:|data:|javascript:)/i;

export function isInScope(sourcePath) {
  const normalized = sourcePath.split(path.sep).join("/").replace(/^\.\//, "");
  return normalized.endsWith(".md")
    && !EXCLUDED_FILES.has(normalized)
    && !EXCLUDED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function lineNumber(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function stripImmutableSections(sourcePath, text) {
  if (sourcePath === "AGENTS.md") {
    const sessionLog = text.indexOf("\n## Session Log");
    return sessionLog === -1 ? text : text.slice(0, sessionLog);
  }
  return text;
}

function stripCode(text) {
  const lines = text.split("\n");
  let fence = null;
  return lines.map((line) => {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      return " ".repeat(line.length);
    }
    if (fence !== null) return " ".repeat(line.length);
    return line.replace(/`[^`\n]*`/g, (match) => " ".repeat(match.length));
  }).join("\n");
}

function cleanDestination(rawDestination) {
  let destination = rawDestination.trim();
  if (destination.startsWith("<")) {
    const closing = destination.indexOf(">");
    if (closing !== -1) return destination.slice(1, closing).trim();
  }
  const title = destination.match(/^([^\s]+)(?:\s+["'(].*)?$/);
  destination = title ? title[1] : destination;
  return destination.replace(/\\([() ])/g, "$1");
}

function extractLinks(text) {
  const references = new Map();
  const links = [];
  const definitionPattern = /^\s{0,3}\[([^\]]+)\]:\s*(<[^>]+>|\S+)(?:\s+.*)?$/gm;
  for (const match of text.matchAll(definitionPattern)) {
    references.set(match[1].trim().toLowerCase(), cleanDestination(match[2]));
  }

  const inlinePattern = /!?\[[^\]\n]*\]\((<[^>\n]+>|(?:\\.|[^)\n])*)\)/g;
  for (const match of text.matchAll(inlinePattern)) {
    links.push({ destination: cleanDestination(match[1]), offset: match.index });
  }

  const referencePattern = /!?\[([^\]\n]*)\]\[([^\]\n]*)\]/g;
  for (const match of text.matchAll(referencePattern)) {
    const label = (match[2] || match[1]).trim().toLowerCase();
    const destination = references.get(label);
    if (destination) links.push({ destination, offset: match.index });
  }

  const htmlPattern = /<(?:a|img)\b[^>]*?\b(?:href|src)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (const match of text.matchAll(htmlPattern)) {
    links.push({ destination: match[1], offset: match.index });
  }

  return links;
}

function githubSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function collectAnchors(markdown) {
  const anchors = new Set();
  const counts = new Map();
  let fence = null;
  for (const line of markdown.split("\n")) {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!heading) continue;
    const base = githubSlug(heading[1]);
    if (!base) continue;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  for (const match of markdown.matchAll(/\b(?:id|name)=["']([^"']+)["']/gi)) {
    anchors.add(match[1]);
  }
  return anchors;
}

function decodeComponent(value, sourcePath, destination, line, errors, kind) {
  try {
    return decodeURIComponent(value);
  } catch {
    errors.push({ sourcePath, line, destination, reason: `invalid URL encoding in ${kind}` });
    return null;
  }
}

function splitDestination(destination) {
  const hashIndex = destination.indexOf("#");
  const beforeFragment = hashIndex === -1 ? destination : destination.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : destination.slice(hashIndex + 1).split("?", 1)[0];
  return {
    filePart: beforeFragment.split("?", 1)[0],
    fragment,
  };
}

export function validateMarkdownLinks({ root, files }) {
  const absoluteRoot = path.resolve(root);
  const sourceFiles = files ?? execFileSync(
    "git",
    ["ls-files", "-z", "--", "*.md"],
    { cwd: absoluteRoot, encoding: "utf8" },
  ).split("\0").filter(Boolean);
  const errors = [];
  let checkedLinks = 0;
  let checkedFiles = 0;

  for (const sourcePathRaw of sourceFiles) {
    const sourcePath = sourcePathRaw.split(path.sep).join("/").replace(/^\.\//, "");
    if (!isInScope(sourcePath)) continue;
    const absoluteSource = path.join(absoluteRoot, sourcePath);
    if (!existsSync(absoluteSource)) continue;
    checkedFiles += 1;
    const original = readFileSync(absoluteSource, "utf8");
    const relevant = stripImmutableSections(sourcePath, original);
    const visible = stripCode(relevant);

    for (const link of extractLinks(visible)) {
      const destination = link.destination.trim();
      if (!destination || EXTERNAL_SCHEMES.test(destination) || destination.startsWith("//")) continue;
      checkedLinks += 1;
      const line = lineNumber(visible, link.offset);
      const { filePart: rawFilePart, fragment: rawFragment } = splitDestination(destination);
      const filePart = decodeComponent(rawFilePart, sourcePath, destination, line, errors, "path");
      const fragment = decodeComponent(rawFragment, sourcePath, destination, line, errors, "fragment");
      if (filePart === null || fragment === null) continue;

      const target = filePart === ""
        ? absoluteSource
        : filePart.startsWith("/")
          ? path.resolve(absoluteRoot, `.${filePart}`)
          : path.resolve(path.dirname(absoluteSource), filePart);
      const relativeTarget = path.relative(absoluteRoot, target);
      if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
        errors.push({ sourcePath, line, destination, reason: "target escapes repository root" });
        continue;
      }
      if (!existsSync(target)) {
        errors.push({ sourcePath, line, destination, reason: `missing local target ${relativeTarget}` });
        continue;
      }
      if (!fragment) continue;
      if (statSync(target).isDirectory()) {
        errors.push({ sourcePath, line, destination, reason: "directory targets cannot contain anchors" });
        continue;
      }
      if (!target.toLowerCase().endsWith(".md")) continue;
      const anchors = collectAnchors(readFileSync(target, "utf8"));
      if (!anchors.has(fragment) && !anchors.has(fragment.toLowerCase())) {
        errors.push({ sourcePath, line, destination, reason: `missing anchor #${fragment} in ${relativeTarget}` });
      }
    }
  }

  return { checkedFiles, checkedLinks, errors };
}

function main() {
  const root = process.cwd();
  const result = validateMarkdownLinks({ root });
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`${error.sourcePath}:${error.line}: ${error.destination} — ${error.reason}`);
    }
    console.error(`Markdown link check failed: ${result.errors.length} error(s) across ${result.checkedFiles} file(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Markdown link check passed: ${result.checkedLinks} local link(s) across ${result.checkedFiles} active file(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
