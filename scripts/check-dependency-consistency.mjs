#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const lockfilePath = resolve(repositoryRoot, 'pnpm-lock.yaml');
const errors = [];
const lockfile = readFileSync(lockfilePath, 'utf8');
const rootPackage = readJson('package.json');
const dashboardPackage = readJson('services/admin-dashboard/package.json');

const expectedTypeScriptVersion = '6.0.3';
const expectedWorkspaceTypeScriptSpecifier = '^6.0.3';

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(resolve(repositoryRoot, relativePath), 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Unable to read ${relativePath}: ${message}`);
    return {};
  }
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"')))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function importerSection(importerName) {
  const marker = `  ${importerName}:\n`;
  const start = lockfile.indexOf(marker);
  if (start < 0) {
    errors.push(`pnpm-lock.yaml is missing importer '${importerName}'.`);
    return '';
  }

  const nextImporterPattern = /^  [^ \n][^\n]*:\n/gm;
  nextImporterPattern.lastIndex = start + marker.length;
  const nextImporter = nextImporterPattern.exec(lockfile);
  return lockfile.slice(start + marker.length, nextImporter?.index ?? lockfile.length);
}

function importerDependency(importerName, dependencyName) {
  const section = importerSection(importerName);
  const lines = section.split('\n');
  const dependencyLine = `      ${dependencyName}:`;
  const dependencyIndex = lines.findIndex((line) => line === dependencyLine);
  if (dependencyIndex < 0) {
    errors.push(`pnpm-lock.yaml importer '${importerName}' is missing '${dependencyName}'.`);
    return undefined;
  }

  const specifierLine = lines[dependencyIndex + 1] ?? '';
  const versionLine = lines[dependencyIndex + 2] ?? '';
  const specifierMatch = /^        specifier:\s*(.+)$/.exec(specifierLine);
  const versionMatch = /^        version:\s*(.+)$/.exec(versionLine);
  if (specifierMatch === null || versionMatch === null) {
    errors.push(`pnpm-lock.yaml importer '${importerName}' has malformed '${dependencyName}' metadata.`);
    return undefined;
  }

  return {
    specifier: unquote(specifierMatch[1]),
    version: unquote(versionMatch[1]),
  };
}

function resolvedVersion(version) {
  return version.split('(', 1)[0];
}

const rootNextOverride = rootPackage.pnpm?.overrides?.next;
const dashboardNextSpecifier = dashboardPackage.dependencies?.next;
const lockNextOverrideMatch = /^  next:\s*(.+)$/m.exec(lockfile);
const lockNextOverride = lockNextOverrideMatch === null ? undefined : unquote(lockNextOverrideMatch[1]);

if (typeof rootNextOverride !== 'string') {
  errors.push("package.json must declare pnpm.overrides.next.");
}
if (typeof dashboardNextSpecifier !== 'string') {
  errors.push("services/admin-dashboard/package.json must declare dependencies.next.");
}
if (typeof rootNextOverride === 'string' && typeof dashboardNextSpecifier === 'string') {
  if (rootNextOverride !== dashboardNextSpecifier) {
    errors.push(
      `Next.js policy mismatch: package.json pnpm.overrides.next is '${rootNextOverride}', ` +
        `but services/admin-dashboard/package.json declares '${dashboardNextSpecifier}'.`,
    );
  }
  if (lockNextOverride !== rootNextOverride) {
    errors.push(
      `Next.js lockfile mismatch: package.json pnpm.overrides.next is '${rootNextOverride}', ` +
        `but pnpm-lock.yaml overrides.next is '${lockNextOverride ?? '<missing>'}'.`,
    );
  }
}

const dashboardNext = importerDependency('services/admin-dashboard', 'next');
if (dashboardNext !== undefined && typeof dashboardNextSpecifier === 'string') {
  if (dashboardNext.specifier !== dashboardNextSpecifier) {
    errors.push(
      `Dashboard lockfile mismatch: importer specifier for next is '${dashboardNext.specifier}', ` +
        `but the manifest declares '${dashboardNextSpecifier}'.`,
    );
  }
  if (resolvedVersion(dashboardNext.version) !== dashboardNextSpecifier) {
    errors.push(
      `Dashboard resolution mismatch: importer next resolves to '${dashboardNext.version}', ` +
        `but the direct dependency is '${dashboardNextSpecifier}'.`,
    );
  }
}

const rootTypeScriptSpecifier = rootPackage.devDependencies?.typescript;
if (rootTypeScriptSpecifier !== expectedTypeScriptVersion) {
  errors.push(
    `Root TypeScript ownership mismatch: package.json devDependencies.typescript must be ` +
      `exactly '${expectedTypeScriptVersion}' for the root tsc contract (found '${rootTypeScriptSpecifier ?? '<missing>'}').`,
  );
}
const rootTypeScript = importerDependency('.', 'typescript');
if (rootTypeScript !== undefined) {
  if (rootTypeScript.specifier !== rootTypeScriptSpecifier) {
    errors.push(
      `Root lockfile mismatch: importer specifier for typescript is '${rootTypeScript.specifier}', ` +
        `but package.json declares '${rootTypeScriptSpecifier ?? '<missing>'}'.`,
    );
  }
  if (resolvedVersion(rootTypeScript.version) !== expectedTypeScriptVersion) {
    errors.push(
      `Root TypeScript resolution mismatch: importer typescript resolves to '${rootTypeScript.version}', ` +
        `expected '${expectedTypeScriptVersion}'.`,
    );
  }
}

for (const importerName of [
  'services/admin-dashboard',
  'services/admin-pulse-bos',
  'services/elizaos-plugin-conxian',
]) {
  const packagePath = `${importerName}/package.json`;
  const packageJson = readJson(packagePath);
  const manifestSpecifier = packageJson.devDependencies?.typescript;
  if (manifestSpecifier !== expectedWorkspaceTypeScriptSpecifier) {
    errors.push(
      `${packagePath} must keep TypeScript deferred at '${expectedWorkspaceTypeScriptSpecifier}' ` +
        `(found '${manifestSpecifier ?? '<missing>'}').`,
    );
  }
  const lockTypeScript = importerDependency(importerName, 'typescript');
  if (lockTypeScript !== undefined) {
    if (lockTypeScript.specifier !== manifestSpecifier) {
      errors.push(
        `${importerName} lockfile mismatch: importer specifier for typescript is '${lockTypeScript.specifier}', ` +
          `but the manifest declares '${manifestSpecifier ?? '<missing>'}'.`,
      );
    }
    if (resolvedVersion(lockTypeScript.version) !== expectedTypeScriptVersion) {
      errors.push(
        `${importerName} TypeScript resolution mismatch: importer resolves to '${lockTypeScript.version}', ` +
          `expected '${expectedTypeScriptVersion}'.`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error('Dependency consistency check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Dependency consistency check passed: Next.js ${dashboardNextSpecifier}; ` +
    `TypeScript ${expectedTypeScriptVersion}; root and workspace lockfile importers agree.`,
);
