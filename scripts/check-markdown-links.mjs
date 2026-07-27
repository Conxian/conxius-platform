#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Scope follows docs/INFORMATION_HIERARCHY.md. Historical trees and
// unambiguously named/identified evidence artifacts are immutable. Mutable
// operational runbooks remain in scope, but append-only SIDL runbooks do not.
const EXCLUDED_PREFIXES = [
  "docs/archived-reports/",
  "docs/archived-scripts/",
  "docs/archived-tasks/",
  "openspec/changes/archive/",
];

const EXCLUDED_EVIDENCE_FILES = new Set([
  "docs/runbooks/ATS_EXECUTION_REPORT_JUNE_2026.md",
  "docs/runbooks/BITCOIN_SANDBOX_PRODUCTION_PARITY_MATRIX.md",
  "docs/runbooks/GITHUB_PRIVATE_CONTROL_SNAPSHOT.md",
]);

const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

function normalizedPath(value) {
  return value.split(path.sep).join("/").replace(/^\.\//, "");
}

export function isInScope(sourcePath) {
  const normalized = normalizedPath(sourcePath);
  const immutableEvidence = normalized.startsWith("docs/runbooks/")
    && /_EVIDENCE[^/]*\.md$/i.test(normalized);
  const sidlEvidence = normalized.startsWith("docs/runbooks/SIDL_")
    && normalized.endsWith(".md");
  return normalized.endsWith(".md")
    && !immutableEvidence
    && !sidlEvidence
    && !EXCLUDED_EVIDENCE_FILES.has(normalized)
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

// Replace code with spaces rather than deleting it so diagnostics retain the
// original offsets and line numbers.
function stripFencedCode(text) {
  const lines = text.split("\n");
  let fence = null;
  return lines.map((line) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      return " ".repeat(line.length);
    }
    if (fence !== null) return " ".repeat(line.length);
    return line;
  }).join("\n");
}

function stripCode(text) {
  const withoutFences = stripFencedCode(text);
  let result = "";
  for (let index = 0; index < withoutFences.length;) {
    if (withoutFences[index] !== "`" || withoutFences[index - 1] === "\\") {
      result += withoutFences[index];
      index += 1;
      continue;
    }
    let ticks = 1;
    while (withoutFences[index + ticks] === "`") ticks += 1;
    const marker = "`".repeat(ticks);
    const closing = withoutFences.indexOf(marker, index + ticks);
    if (closing === -1 || withoutFences.slice(index, closing).includes("\n")) {
      result += marker;
      index += ticks;
      continue;
    }
    result += " ".repeat(closing + ticks - index);
    index = closing + ticks;
  }
  return result;
}

function normalizeReferenceLabel(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function findClosingBracket(text, start) {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "\\") index += 1;
    else if (text[index] === "]") return index;
  }
  return -1;
}

function cleanDestination(rawDestination) {
  const value = rawDestination.trim();
  if (value.startsWith("<")) {
    const closing = value.indexOf(">");
    if (closing === -1) return null;
    return value.slice(1, closing).replace(/\\([<> ])/g, "$1");
  }

  let depth = 0;
  let destination = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "\\" && index + 1 < value.length) {
      destination += value[index + 1];
      index += 1;
      continue;
    }
    if (/\s/.test(character) && depth === 0) break;
    if (character === "(") depth += 1;
    if (character === ")" && depth > 0) depth -= 1;
    destination += character;
  }
  return destination || null;
}

function parseDefinitions(text) {
  const definitions = new Map();
  const ranges = [];
  const pattern = /^\s{0,3}\[([^\]\n]+)\]:\s*(<[^>\n]*>|\S+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*$/gm;
  for (const match of text.matchAll(pattern)) {
    const label = normalizeReferenceLabel(match[1]);
    const destination = cleanDestination(match[2]);
    if (label && destination && !definitions.has(label)) definitions.set(label, destination);
    ranges.push([match.index, match.index + match[0].length]);
  }
  return { definitions, ranges };
}

function inRange(index, ranges) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function parseInlineDestination(text, openParenthesis) {
  let depth = 0;
  let angle = false;
  for (let index = openParenthesis + 1; index < text.length; index += 1) {
    const character = text[index];
    if (character === "\\") {
      index += 1;
      continue;
    }
    if (character === "<" && depth === 0) angle = true;
    else if (character === ">" && angle) angle = false;
    else if (!angle && character === "(") depth += 1;
    else if (!angle && character === ")") {
      if (depth === 0) {
        return {
          destination: cleanDestination(text.slice(openParenthesis + 1, index)),
          end: index + 1,
        };
      }
      depth -= 1;
    }
  }
  return null;
}

function extractLinks(text) {
  const { definitions, ranges } = parseDefinitions(text);
  const links = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "[" || text[index - 1] === "\\" || inRange(index, ranges)) continue;
    const isImage = text[index - 1] === "!";
    if (isImage && text[index - 2] === "\\") continue;
    const offset = isImage ? index - 1 : index;
    const textEnd = findClosingBracket(text, index + 1);
    if (textEnd === -1) continue;
    const linkText = text.slice(index + 1, textEnd);
    const next = text[textEnd + 1];

    if (next === "(") {
      const inline = parseInlineDestination(text, textEnd + 1);
      if (inline?.destination) links.push({ destination: inline.destination, offset });
      else links.push({ offset, malformedLink: true });
      if (inline) index = inline.end - 1;
      continue;
    }
    if (next === "[") {
      const labelEnd = findClosingBracket(text, textEnd + 2);
      if (labelEnd === -1) continue;
      const explicit = text.slice(textEnd + 2, labelEnd);
      const label = normalizeReferenceLabel(explicit || linkText);
      const destination = definitions.get(label);
      // Adjacent numeric citation markers such as [1][2] are common in the
      // repository and are plain text unless backed by Markdown definitions.
      if (!destination && /^\d+$/.test(linkText.trim()) && /^\d+$/.test(explicit.trim())) {
        index = labelEnd;
        continue;
      }
      links.push(destination
        ? { destination, offset }
        : { offset, unresolvedReference: label || "(empty)" });
      index = labelEnd;
      continue;
    }
    const shortcutLabel = normalizeReferenceLabel(linkText);
    const shortcutDestination = definitions.get(shortcutLabel);
    if (shortcutDestination) {
      links.push({ destination: shortcutDestination, offset });
      index = textEnd;
    }
  }

  const htmlPattern = /<(?:a|img)\b[^>]*?\b(?:href|src)\s*=\s*["']([^"']+)["'][^>]*>/gi;
  for (const match of text.matchAll(htmlPattern)) links.push({ destination: match[1], offset: match.index });
  return links.sort((left, right) => left.offset - right.offset);
}

function headingText(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/\\([\\`*_[\]{}()#+.!~-])/g, "$1")
    .replace(/[`*~]/g, "");
}

function githubSlug(value) {
  return headingText(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

export function collectAnchors(markdown) {
  // Markdown heading text keeps inline-code contents in its GitHub slug, while
  // raw HTML anchor discovery must not treat code examples as live tags.
  const headingVisible = stripFencedCode(markdown);
  const htmlVisible = stripCode(markdown);
  const anchors = new Set();
  const counts = new Map();
  const lines = headingVisible.split("\n");
  const codeStrippedLines = htmlVisible.split("\n");

  function addHeading(value) {
    const base = githubSlug(value);
    if (!base) return;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = line.match(/^\s{0,3}#{1,6}(?:\s+|$)(.*?)\s*$/);
    if (heading) {
      addHeading(heading[1].replace(/\s+#+\s*$/, ""));
      continue;
    }

    if (index === 0 || !/^\s{0,3}(?:=+|-+)\s*$/.test(line)) continue;
    const previous = lines[index - 1];
    if (!codeStrippedLines[index - 1].trim()
      || /^\s{0,3}#{1,6}(?:\s+|$)/.test(previous)) continue;
    addHeading(previous.trim());
  }

  const openingTag = /<([A-Za-z][A-Za-z0-9:-]*)\b([^<>]*)>/g;
  for (const match of htmlVisible.matchAll(openingTag)) {
    const tagName = match[1].toLowerCase();
    const attributes = match[2];
    const id = attributes.match(/(?:^|\s)id\s*=\s*["']([^"']+)["']/i);
    if (id) anchors.add(id[1]);
    if (tagName === "a") {
      const name = attributes.match(/(?:^|\s)name\s*=\s*["']([^"']+)["']/i);
      if (name) anchors.add(name[1]);
    }
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
  return { filePart: beforeFragment.split("?", 1)[0], fragment };
}

function isContained(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeRealpath(target, absoluteRoot, rootRealpath, sourcePath, line, destination, errors) {
  let realTarget;
  try {
    realTarget = realpathSync(target);
  } catch {
    errors.push({ sourcePath, line, destination, reason: `cannot resolve local target ${normalizedPath(path.relative(absoluteRoot, target))}` });
    return null;
  }
  if (!isContained(rootRealpath, realTarget)) {
    errors.push({ sourcePath, line, destination, reason: "target resolves outside repository root through a symlink" });
    return null;
  }
  return realTarget;
}

export function validateMarkdownLinks({ root, files }) {
  const absoluteRoot = path.resolve(root);
  const rootRealpath = realpathSync(absoluteRoot);
  const sourceFiles = files ?? execFileSync(
    "git",
    ["ls-files", "-z", "--", "*.md"],
    { cwd: absoluteRoot, encoding: "utf8" },
  ).split("\0").filter(Boolean);
  const errors = [];
  let checkedLinks = 0;
  let checkedFiles = 0;

  for (const sourcePathRaw of sourceFiles) {
    const sourcePath = normalizedPath(sourcePathRaw);
    if (!isInScope(sourcePath)) continue;
    const absoluteSource = path.join(absoluteRoot, sourcePath);
    if (!existsSync(absoluteSource)) continue;
    const realSource = safeRealpath(absoluteSource, absoluteRoot, rootRealpath, sourcePath, 1, sourcePath, errors);
    if (!realSource) continue;
    checkedFiles += 1;
    const original = readFileSync(realSource, "utf8");
    const relevant = stripImmutableSections(sourcePath, original);
    const visible = stripCode(relevant);

    for (const link of extractLinks(visible)) {
      const line = lineNumber(visible, link.offset);
      if (link.malformedLink) {
        errors.push({ sourcePath, line, destination: "(malformed Markdown link)", reason: "malformed or unterminated inline link destination" });
        continue;
      }
      if (link.unresolvedReference) {
        errors.push({ sourcePath, line, destination: `[${link.unresolvedReference}]`, reason: `unresolved reference label ${link.unresolvedReference}` });
        continue;
      }
      const destination = link.destination.trim();
      if (!destination || URI_SCHEME.test(destination) || destination.startsWith("//")) continue;
      checkedLinks += 1;
      const { filePart: rawFilePart, fragment: rawFragment } = splitDestination(destination);
      const filePart = decodeComponent(rawFilePart, sourcePath, destination, line, errors, "path");
      const fragment = decodeComponent(rawFragment, sourcePath, destination, line, errors, "fragment");
      if (filePart === null || fragment === null) continue;

      const target = filePart === ""
        ? realSource
        : filePart.startsWith("/")
          ? path.resolve(absoluteRoot, `.${filePart}`)
          : path.resolve(path.dirname(absoluteSource), filePart);
      if (!isContained(absoluteRoot, target)) {
        errors.push({ sourcePath, line, destination, reason: "target escapes repository root" });
        continue;
      }
      if (!existsSync(target)) {
        errors.push({ sourcePath, line, destination, reason: `missing local target ${normalizedPath(path.relative(absoluteRoot, target))}` });
        continue;
      }
      let realTarget = safeRealpath(target, absoluteRoot, rootRealpath, sourcePath, line, destination, errors);
      if (!realTarget) continue;
      if (!fragment) continue;
      if (statSync(realTarget).isDirectory()) {
        const readme = path.join(realTarget, "README.md");
        if (!existsSync(readme)) {
          errors.push({ sourcePath, line, destination, reason: "directory target has no README.md for anchor validation" });
          continue;
        }
        realTarget = safeRealpath(readme, absoluteRoot, rootRealpath, sourcePath, line, destination, errors);
        if (!realTarget) continue;
      }
      if (!realTarget.toLowerCase().endsWith(".md")) continue;
      const anchors = collectAnchors(readFileSync(realTarget, "utf8"));
      if (!anchors.has(fragment)) {
        errors.push({ sourcePath, line, destination, reason: `missing anchor #${fragment} in ${normalizedPath(path.relative(absoluteRoot, realTarget))}` });
      }
    }
  }
  return { checkedFiles, checkedLinks, errors };
}

function main() {
  const result = validateMarkdownLinks({ root: process.cwd() });
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`${error.sourcePath}:${error.line}: ${error.destination} — ${error.reason}`);
    console.error(`Markdown link check failed: ${result.errors.length} error(s) across ${result.checkedFiles} file(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Markdown link check passed: ${result.checkedLinks} local link(s) across ${result.checkedFiles} active file(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
