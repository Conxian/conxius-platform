#!/usr/bin/env -S pnpm exec tsx

import {
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'node:fs';
import {
  dirname,
  join,
  relative,
  resolve,
} from 'node:path';

import {
  DISCOVERY_ATTESTATION_PROTOCOL,
  DISCOVERY_ATTESTATION_VERSION,
  DISCOVERY_TRUST_ANCHOR_PROTOCOL,
  DISCOVERY_TRUST_ANCHOR_VERSION,
  discoveryAttestationScope,
  discoveryDigestFor,
  type DiscoveryAttestation,
  type DiscoveryContextTier,
  type DiscoveryDigest,
  type DiscoveryTrustAnchor,
  type DiscoveryTrustContextEntry,
  type DiscoveryTrustSkillEntry,
} from './agent-discovery-contract';

export {
  DISCOVERY_ATTESTATION_PROTOCOL,
  DISCOVERY_ATTESTATION_VERSION,
  DISCOVERY_TRUST_ANCHOR_PROTOCOL,
  DISCOVERY_TRUST_ANCHOR_VERSION,
} from './agent-discovery-contract';
export type {
  DiscoveryAttestation,
  DiscoveryContextTier,
  DiscoveryDigest,
  DiscoveryTrustAnchor,
  DiscoveryTrustContextEntry,
  DiscoveryTrustSkillEntry,
} from './agent-discovery-contract';

export const DISCOVERY_PROTOCOL = 'conxian-agent-discovery';
export const SUPPORTED_PROTOCOL_MAJOR = 1;
export const MANIFEST_RELATIVE_PATH = '.agents/manifest.json';
export const REQUIRED_CONTEXT_PATHS = [
  'AGENTS.md',
  'GOVERNANCE.md',
  'docs/AGENT_ONBOARDING.md',
  'docs/SESSION_CONTINUITY.md',
] as const;

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const SKILL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type JsonRecord = Record<string, unknown>;

export interface ContextEntry {
  path: string;
  priority: number;
  description: string;
}

export interface AgentManifest {
  manifestVersion: string;
  protocol: typeof DISCOVERY_PROTOCOL;
  repository: {
    rootMarker: string;
  };
  context: {
    required: ContextEntry[];
    optional: ContextEntry[];
  };
  skills: {
    registry: string;
  };
}

export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  path: string;
  status: 'active' | 'inactive' | 'deprecated';
  default: boolean;
  activation: 'manual';
  loadPolicy: 'content-only';
  contentFormat: 'markdown-with-frontmatter';
  capabilities: string[];
  metadata: {
    version: string;
    owner: string;
  };
}

export interface SkillRegistry {
  registryVersion: string;
  protocol: typeof DISCOVERY_PROTOCOL;
  skills: SkillMetadata[];
}

export interface LoadedContext extends ContextEntry {
  content: string;
}

export interface LoadedSkill {
  metadata: SkillMetadata;
  content: string;
}

export interface DiscoveryResult {
  ok: true;
  protocol: typeof DISCOVERY_PROTOCOL;
  repository: {
    root: '.';
  };
  manifest: {
    path: typeof MANIFEST_RELATIVE_PATH;
    version: string;
  };
  context: {
    required: LoadedContext[];
    optional: LoadedContext[];
  };
  skills: {
    registry: {
      path: string;
      version: string;
    };
    selected: LoadedSkill[];
  };
  attestation: DiscoveryAttestation;
  warnings: string[];
}

export interface DiscoveryOptions {
  includeOptional?: boolean;
  skills?: readonly string[];
}

export interface CliOptions {
  json: boolean;
  includeOptional: boolean;
  root: string | undefined;
  skills: string[];
  help: boolean;
}

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class DiscoveryError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = 'DiscoveryError';
    this.code = code;
  }
}

interface RepositoryLocation {
  rootDirectory: string;
  realRootDirectory: string;
  manifestPath: string;
}

interface DeclaredFile {
  relativePath: string;
  absolutePath: string;
  exists: boolean;
}

interface InternalSkillMetadata extends SkillMetadata {
  declaredFile: DeclaredFile;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) {
    throw new DiscoveryError('invalid-contract', `${label} must be a JSON object.`);
  }
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new DiscoveryError('invalid-contract', `${label} must be a JSON array.`);
  }
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new DiscoveryError('invalid-contract', `${label} must be a non-empty string.`);
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new DiscoveryError('invalid-contract', `${label} must be a boolean.`);
  }
  return value;
}

function requireInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new DiscoveryError('invalid-contract', `${label} must be a positive integer.`);
  }
  return value;
}

function assertKeys(value: JsonRecord, allowed: readonly string[], label: string): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      throw new DiscoveryError('invalid-contract', `${label} contains unsupported field '${key}'.`);
    }
  }
}

function validateSemanticVersion(value: unknown, label: string): string {
  const version = requireString(value, label);
  if (!SEMVER_PATTERN.test(version)) {
    throw new DiscoveryError('invalid-version', `${label} must use MAJOR.MINOR.PATCH form.`);
  }
  return version;
}

function assertSupportedMajor(version: string, label: string): void {
  const match = SEMVER_PATTERN.exec(version);
  if (match === null) {
    throw new DiscoveryError('invalid-version', `${label} must use MAJOR.MINOR.PATCH form.`);
  }
  const major = Number(match[1]);
  if (major !== SUPPORTED_PROTOCOL_MAJOR) {
    throw new DiscoveryError(
      'unsupported-major',
      `${label} major version ${major} is unsupported; supported major is ${SUPPORTED_PROTOCOL_MAJOR}.`,
    );
  }
}

function validateRelativePath(value: unknown, label: string): string {
  const candidate = requireString(value, label);
  if (
    candidate.includes('\0') ||
    candidate.includes('\\') ||
    candidate.startsWith('/') ||
    /^[A-Za-z]:/.test(candidate) ||
    candidate.startsWith('//')
  ) {
    throw new DiscoveryError('unsafe-path', `${label} must be a repository-relative POSIX path.`);
  }

  const segments = candidate.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new DiscoveryError('unsafe-path', `${label} contains an empty, current-directory, or traversal segment.`);
  }

  return candidate;
}

function normalizePathSeparators(value: string): string {
  return value.replaceAll('\\', '/');
}

function isAbsolutePath(value: string): boolean {
  const normalizedValue = normalizePathSeparators(value);
  return normalizedValue.startsWith('/') || /^[A-Za-z]:\//.test(normalizedValue);
}

export function isRelativePathWithinRoot(targetRelative: string): boolean {
  const normalizedRelative = normalizePathSeparators(targetRelative);
  if (normalizedRelative === '') {
    return true;
  }
  if (isAbsolutePath(normalizedRelative)) {
    return false;
  }

  const segments = normalizedRelative.split('/');
  return !segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..');
}

export function isContainedRelativePath(targetRelative: string): boolean {
  return isRelativePathWithinRoot(targetRelative);
}

function isWithin(rootDirectory: string, targetPath: string): boolean {
  return isRelativePathWithinRoot(relative(rootDirectory, targetPath));
}

function tryLstat(targetPath: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(targetPath);
  } catch (error: unknown) {
    if (isMissingFileError(error)) {
      return undefined;
    }
    throw new DiscoveryError('filesystem', 'Unable to inspect a declared repository path.');
  }
}

function isMissingFileError(error: unknown): boolean {
  return isRecord(error) && error.code === 'ENOENT';
}

function nearestExistingPath(targetPath: string, rootDirectory: string): string {
  let current = targetPath;
  while (true) {
    const stat = tryLstat(current);
    if (stat !== undefined) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current || !isWithin(rootDirectory, parent)) {
      return rootDirectory;
    }
    current = parent;
  }
}

function inspectDeclaredFile(
  rootDirectory: string,
  relativePath: string,
  label: string,
  required: boolean,
): DeclaredFile {
  const absolutePath = resolve(rootDirectory, ...relativePath.split('/'));
  if (!isWithin(rootDirectory, absolutePath)) {
    throw new DiscoveryError('unsafe-path', `${label} resolves outside the repository root.`);
  }

  const existingPrefix = nearestExistingPath(absolutePath, rootDirectory);
  let realPrefix: string;
  try {
    realPrefix = realpathSync(existingPrefix);
  } catch {
    throw new DiscoveryError('filesystem', `${label} has an unreadable path prefix.`);
  }
  if (!isWithin(rootDirectory, realPrefix)) {
    throw new DiscoveryError('unsafe-path', `${label} resolves through a symlink outside the repository root.`);
  }

  const stat = tryLstat(absolutePath);
  if (stat === undefined) {
    if (required) {
      throw new DiscoveryError('missing-required', `${label} is required but missing.`);
    }
    return { relativePath, absolutePath, exists: false };
  }

  let realTarget: string;
  try {
    realTarget = realpathSync(absolutePath);
  } catch {
    throw new DiscoveryError('filesystem', `${label} is not a resolvable file.`);
  }
  if (!isWithin(rootDirectory, realTarget)) {
    throw new DiscoveryError('unsafe-path', `${label} resolves through a symlink outside the repository root.`);
  }

  let followedStat: ReturnType<typeof statSync>;
  try {
    followedStat = statSync(absolutePath);
  } catch {
    throw new DiscoveryError('filesystem', `${label} is not a readable file.`);
  }
  if (!followedStat.isFile()) {
    throw new DiscoveryError('invalid-contract', `${label} must resolve to a regular file.`);
  }

  return { relativePath, absolutePath, exists: true };
}

function readDeclaredFile(declaredFile: DeclaredFile, label: string): string {
  if (!declaredFile.exists) {
    throw new DiscoveryError('missing-required', `${label} is required but missing.`);
  }
  try {
    return readFileSync(declaredFile.absolutePath, 'utf8');
  } catch {
    throw new DiscoveryError('filesystem', `${label} could not be read.`);
  }
}

function parseJsonFile(declaredFile: DeclaredFile, label: string): { content: string; value: unknown } {
  const content = readDeclaredFile(declaredFile, label);
  try {
    return { content, value: JSON.parse(content) as unknown };
  } catch {
    throw new DiscoveryError('invalid-json', `${label} is not valid JSON.`);
  }
}

function parseContextEntries(
  value: unknown,
  label: string,
  seenPaths: Set<string>,
  seenPriorities: Set<number>,
  minimumPriority = 0,
): ContextEntry[] {
  const entries = requireArray(value, label);
  const parsed: ContextEntry[] = [];
  let previousPriority = minimumPriority;

  for (const [index, entryValue] of entries.entries()) {
    const entry = requireRecord(entryValue, `${label}[${index}]`);
    assertKeys(entry, ['path', 'priority', 'description'], `${label}[${index}]`);
    const pathValue = validateRelativePath(entry.path, `${label}[${index}].path`);
    if (seenPaths.has(pathValue)) {
      throw new DiscoveryError('duplicate-entry', `${label} contains duplicate path '${pathValue}'.`);
    }
    seenPaths.add(pathValue);
    const priority = requireInteger(entry.priority, `${label}[${index}].priority`);
    if (seenPriorities.has(priority)) {
      throw new DiscoveryError('duplicate-entry', `${label} contains duplicate priority '${priority}'.`);
    }
    if (priority <= previousPriority) {
      throw new DiscoveryError('invalid-priority', `${label} priorities must ascend strictly.`);
    }
    seenPriorities.add(priority);
    previousPriority = priority;
    parsed.push({
      path: pathValue,
      priority,
      description: requireString(entry.description, `${label}[${index}].description`),
    });
  }

  return parsed;
}

function parseManifest(value: unknown): AgentManifest {
  const manifest = requireRecord(value, 'manifest');
  assertKeys(
    manifest,
    ['$schema', 'manifestVersion', 'protocol', 'repository', 'context', 'skills'],
    'manifest',
  );
  const manifestVersion = validateSemanticVersion(manifest.manifestVersion, 'manifest.manifestVersion');
  assertSupportedMajor(manifestVersion, 'manifest.manifestVersion');
  if (manifest.protocol !== DISCOVERY_PROTOCOL) {
    throw new DiscoveryError('invalid-contract', `manifest.protocol must be '${DISCOVERY_PROTOCOL}'.`);
  }

  const repository = requireRecord(manifest.repository, 'manifest.repository');
  assertKeys(repository, ['rootMarker'], 'manifest.repository');
  const rootMarker = validateRelativePath(repository.rootMarker, 'manifest.repository.rootMarker');

  const context = requireRecord(manifest.context, 'manifest.context');
  assertKeys(context, ['required', 'optional'], 'manifest.context');
  const seenPaths = new Set<string>();
  const seenPriorities = new Set<number>();
  const required = parseContextEntries(
    context.required,
    'manifest.context.required',
    seenPaths,
    seenPriorities,
  );
  const optional = parseContextEntries(
    context.optional,
    'manifest.context.optional',
    seenPaths,
    seenPriorities,
    required[required.length - 1]?.priority ?? 0,
  );
  const requiredPaths = new Set(required.map((entry) => entry.path));
  for (const requiredPath of REQUIRED_CONTEXT_PATHS) {
    if (!requiredPaths.has(requiredPath)) {
      throw new DiscoveryError('invalid-contract', `Required context is missing '${requiredPath}'.`);
    }
  }
  if (rootMarker !== 'AGENTS.md' || !requiredPaths.has(rootMarker)) {
    throw new DiscoveryError('invalid-contract', 'manifest.repository.rootMarker must be required AGENTS.md.');
  }

  const skills = requireRecord(manifest.skills, 'manifest.skills');
  assertKeys(skills, ['registry'], 'manifest.skills');
  const registry = validateRelativePath(skills.registry, 'manifest.skills.registry');

  return {
    manifestVersion,
    protocol: DISCOVERY_PROTOCOL,
    repository: { rootMarker },
    context: { required, optional },
    skills: { registry },
  };
}

function parseSkillMetadata(value: unknown, index: number): InternalSkillMetadata {
  const label = `registry.skills[${index}]`;
  const skill = requireRecord(value, label);
  assertKeys(
    skill,
    [
      'id',
      'name',
      'description',
      'path',
      'status',
      'default',
      'activation',
      'loadPolicy',
      'contentFormat',
      'capabilities',
      'metadata',
    ],
    label,
  );
  const id = requireString(skill.id, `${label}.id`);
  if (!SKILL_ID_PATTERN.test(id)) {
    throw new DiscoveryError('invalid-contract', `${label}.id is not a valid skill ID.`);
  }
  const name = requireString(skill.name, `${label}.name`);
  const description = requireString(skill.description, `${label}.description`);
  const pathValue = validateRelativePath(skill.path, `${label}.path`);
  const statusValue = requireString(skill.status, `${label}.status`);
  if (statusValue !== 'active' && statusValue !== 'inactive' && statusValue !== 'deprecated') {
    throw new DiscoveryError('invalid-contract', `${label}.status is invalid.`);
  }
  const isDefault = requireBoolean(skill.default, `${label}.default`);
  if (isDefault && statusValue !== 'active') {
    throw new DiscoveryError('invalid-contract', `${label}.default skills must be active.`);
  }
  if (skill.activation !== 'manual') {
    throw new DiscoveryError('invalid-contract', `${label}.activation must be manual.`);
  }
  if (skill.loadPolicy !== 'content-only') {
    throw new DiscoveryError('invalid-contract', `${label}.loadPolicy must be content-only.`);
  }
  if (skill.contentFormat !== 'markdown-with-frontmatter') {
    throw new DiscoveryError('invalid-contract', `${label}.contentFormat is unsupported.`);
  }

  const capabilities = requireArray(skill.capabilities, `${label}.capabilities`).map((capability, capabilityIndex) =>
    requireString(capability, `${label}.capabilities[${capabilityIndex}]`),
  );
  if (new Set(capabilities).size !== capabilities.length) {
    throw new DiscoveryError('duplicate-entry', `${label}.capabilities contains duplicates.`);
  }

  const metadata = requireRecord(skill.metadata, `${label}.metadata`);
  assertKeys(metadata, ['version', 'owner'], `${label}.metadata`);
  const metadataVersion = validateSemanticVersion(metadata.version, `${label}.metadata.version`);
  const owner = requireString(metadata.owner, `${label}.metadata.owner`);

  return {
    id,
    name,
    description,
    path: pathValue,
    status: statusValue,
    default: isDefault,
    activation: 'manual',
    loadPolicy: 'content-only',
    contentFormat: 'markdown-with-frontmatter',
    capabilities,
    metadata: {
      version: metadataVersion,
      owner,
    },
    declaredFile: {
      relativePath: pathValue,
      absolutePath: '',
      exists: false,
    },
  };
}

function parseRegistry(value: unknown): SkillRegistry {
  const registry = requireRecord(value, 'registry');
  assertKeys(registry, ['$schema', 'registryVersion', 'protocol', 'skills'], 'registry');
  const registryVersion = validateSemanticVersion(registry.registryVersion, 'registry.registryVersion');
  assertSupportedMajor(registryVersion, 'registry.registryVersion');
  if (registry.protocol !== DISCOVERY_PROTOCOL) {
    throw new DiscoveryError('invalid-contract', `registry.protocol must be '${DISCOVERY_PROTOCOL}'.`);
  }

  const skillValues = requireArray(registry.skills, 'registry.skills');
  if (skillValues.length === 0) {
    throw new DiscoveryError('invalid-contract', 'registry.skills must not be empty.');
  }
  const skills: SkillMetadata[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const [index, skillValue] of skillValues.entries()) {
    const skill = parseSkillMetadata(skillValue, index);
    if (ids.has(skill.id)) {
      throw new DiscoveryError('duplicate-entry', `registry.skills contains duplicate ID '${skill.id}'.`);
    }
    if (paths.has(skill.path)) {
      throw new DiscoveryError('duplicate-entry', `registry.skills contains duplicate path '${skill.path}'.`);
    }
    ids.add(skill.id);
    paths.add(skill.path);
    skills.push(skill);
  }
  if (!skills.some((skill) => skill.status === 'active' && skill.default)) {
    throw new DiscoveryError('invalid-contract', 'registry must define at least one active default skill.');
  }

  return { registryVersion, protocol: DISCOVERY_PROTOCOL, skills };
}

function findRepositoryLocation(startDirectory: string): RepositoryLocation {
  const requestedDirectory = resolve(startDirectory);
  let requestedStat: ReturnType<typeof statSync>;
  try {
    requestedStat = statSync(requestedDirectory);
  } catch {
    throw new DiscoveryError('invalid-root', 'The requested discovery directory does not exist.');
  }
  if (!requestedStat.isDirectory()) {
    throw new DiscoveryError('invalid-root', 'The requested discovery root must be a directory.');
  }

  let currentDirectory: string;
  try {
    currentDirectory = realpathSync(requestedDirectory);
  } catch {
    throw new DiscoveryError('invalid-root', 'The requested discovery directory is not resolvable.');
  }

  while (true) {
    const manifestPath = join(currentDirectory, MANIFEST_RELATIVE_PATH);
    const manifestStat = tryLstat(manifestPath);
    if (manifestStat !== undefined) {
      if (!manifestStat.isFile() && !manifestStat.isSymbolicLink()) {
        throw new DiscoveryError('invalid-contract', `${MANIFEST_RELATIVE_PATH} must be a regular file.`);
      }
      const realRootDirectory = realpathSync(currentDirectory);
      let realManifestPath: string;
      try {
        realManifestPath = realpathSync(manifestPath);
      } catch {
        throw new DiscoveryError('filesystem', `${MANIFEST_RELATIVE_PATH} is not resolvable.`);
      }
      if (!isWithin(realRootDirectory, realManifestPath)) {
        throw new DiscoveryError('unsafe-path', `${MANIFEST_RELATIVE_PATH} resolves outside the repository root.`);
      }
      if (!statSync(manifestPath).isFile()) {
        throw new DiscoveryError('invalid-contract', `${MANIFEST_RELATIVE_PATH} must resolve to a regular file.`);
      }
      return {
        rootDirectory: currentDirectory,
        realRootDirectory,
        manifestPath,
      };
    }

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      break;
    }
    currentDirectory = parentDirectory;
  }

  throw new DiscoveryError(
    'manifest-not-found',
    'No .agents/manifest.json was found from the requested directory and its parents.',
  );
}

function parseFrontmatter(content: string, skillId: string): { name: string; description: string } {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    throw new DiscoveryError('invalid-skill', `Skill '${skillId}' is missing YAML frontmatter.`);
  }
  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex < 0) {
    throw new DiscoveryError('invalid-skill', `Skill '${skillId}' has unterminated YAML frontmatter.`);
  }

  let name: string | undefined;
  let description: string | undefined;
  for (const line of lines.slice(1, closingIndex)) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (match === null) {
      continue;
    }
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    if (match[1] === 'name') {
      name = value;
    } else if (match[1] === 'description') {
      description = value;
    }
  }

  if (name !== skillId || description === undefined || description.length === 0) {
    throw new DiscoveryError('invalid-skill', `Skill '${skillId}' frontmatter identity is invalid.`);
  }
  return { name, description };
}

function toPublicSkillMetadata(skill: InternalSkillMetadata): SkillMetadata {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    path: skill.path,
    status: skill.status,
    default: skill.default,
    activation: skill.activation,
    loadPolicy: skill.loadPolicy,
    contentFormat: skill.contentFormat,
    capabilities: [...skill.capabilities],
    metadata: { ...skill.metadata },
  };
}

function discoveryTierForPath(path: string): DiscoveryContextTier {
  if (path === 'GOVERNANCE.md') return 'GOVERNANCE';
  if (path === '.agents/manifest.json' || path === '.agents/skills/registry.json') return 'CANONICAL';
  return 'ARCHITECTURAL';
}

function contextAttestation(entry: LoadedContext, required: boolean): DiscoveryTrustContextEntry {
  return {
    path: entry.path,
    tier: discoveryTierForPath(entry.path),
    required,
    priority: entry.priority,
    description: entry.description,
    content_digest: discoveryDigestFor('conxian-agent-discovery.context-content.v1', entry.content),
  };
}

function skillAttestation(skill: LoadedSkill): DiscoveryTrustSkillEntry {
  return {
    id: skill.metadata.id,
    path: skill.metadata.path,
    metadata_digest: discoveryDigestFor('conxian-agent-discovery.skill-metadata.v1', skill.metadata),
    content_digest: discoveryDigestFor('conxian-agent-discovery.skill-content.v1', skill.content),
  };
}

/**
* Packages a locally validated #1162 result as an adapter-supplied trust anchor.
* This helper is deterministic packaging only; it does not authenticate the
* adapter, repository, or deployment that decides to trust the returned value.
*/
export function buildDiscoveryTrustAnchor(result: DiscoveryResult): DiscoveryTrustAnchor {
  const attestationScope = discoveryAttestationScope(result.attestation);
  const comparePaths = (left: { path: string }, right: { path: string }): number => left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
  const scope = {
    ...attestationScope,
    context: {
      required: [...attestationScope.context.required].sort(comparePaths),
      optional: [...attestationScope.context.optional].sort(comparePaths),
    },
    skills: {
      selected: [...attestationScope.skills.selected].sort(comparePaths),
    },
  };
  return {
    protocol: DISCOVERY_TRUST_ANCHOR_PROTOCOL,
    version: DISCOVERY_TRUST_ANCHOR_VERSION,
    ...scope,
    digest: discoveryDigestFor('conxian-agent-discovery.trust-anchor.v1', scope),
  };
}

export function discoverRepository(
  startDirectory: string = process.cwd(),
  options: DiscoveryOptions = {},
): DiscoveryResult {
  const location = findRepositoryLocation(startDirectory);
  const manifestFile: DeclaredFile = {
    relativePath: MANIFEST_RELATIVE_PATH,
    absolutePath: location.manifestPath,
    exists: true,
  };
  const manifestFileContent = parseJsonFile(manifestFile, MANIFEST_RELATIVE_PATH);
  const manifest = parseManifest(manifestFileContent.value);

  const contextTargets = [
    ...manifest.context.required.map((entry) => ({ entry, required: true })),
    ...manifest.context.optional.map((entry) => ({ entry, required: false })),
  ].map(({ entry, required }) => ({
    entry,
    required,
    declaredFile: inspectDeclaredFile(
      location.realRootDirectory,
      entry.path,
      `Context file '${entry.path}'`,
      required,
    ),
  }));

  const requiredContext: LoadedContext[] = [];
  for (const target of contextTargets.filter((item) => item.required)) {
    requiredContext.push({
      ...target.entry,
      content: readDeclaredFile(target.declaredFile, `Context file '${target.entry.path}'`),
    });
  }

  const warnings: string[] = [];
  const optionalContext: LoadedContext[] = [];
  for (const target of contextTargets.filter((item) => !item.required)) {
    if (!target.declaredFile.exists) {
      warnings.push(`Optional context file '${target.entry.path}' is missing.`);
      continue;
    }
    if (options.includeOptional === true) {
      optionalContext.push({
        ...target.entry,
        content: readDeclaredFile(target.declaredFile, `Optional context file '${target.entry.path}'`),
      });
    }
  }

  const registryFile = inspectDeclaredFile(
    location.realRootDirectory,
    manifest.skills.registry,
    `Skill registry '${manifest.skills.registry}'`,
    true,
  );
  const registryFileContent = parseJsonFile(registryFile, `Skill registry '${manifest.skills.registry}'`);
  const registry = parseRegistry(registryFileContent.value);

  const internalSkills: InternalSkillMetadata[] = registry.skills.map((skill) => ({
    ...skill,
    declaredFile: inspectDeclaredFile(
      location.realRootDirectory,
      skill.path,
      `Skill '${skill.id}'`,
      false,
    ),
  }));

  const requestedSkills = options.skills === undefined ? undefined : [...options.skills];
  if (requestedSkills !== undefined && new Set(requestedSkills).size !== requestedSkills.length) {
    throw new DiscoveryError('duplicate-entry', 'The --skill selection contains duplicate IDs.');
  }
  const selectedIds = requestedSkills ?? internalSkills
    .filter((skill) => skill.status === 'active' && skill.default)
    .map((skill) => skill.id);
  if (selectedIds.length === 0) {
    throw new DiscoveryError('invalid-contract', 'No active default skills are available for discovery.');
  }

  const selectedSkills: LoadedSkill[] = [];
  for (const skillId of selectedIds) {
    const skill = internalSkills.find((candidate) => candidate.id === skillId);
    if (skill === undefined) {
      throw new DiscoveryError('invalid-skill-selection', `Selected skill '${skillId}' is not registered.`);
    }
    if (skill.status !== 'active') {
      throw new DiscoveryError('invalid-skill-selection', `Selected skill '${skillId}' is not active.`);
    }
    if (!skill.declaredFile.exists) {
      throw new DiscoveryError('missing-required', `Selected skill '${skillId}' is required but missing.`);
    }
    const content = readDeclaredFile(skill.declaredFile, `Skill '${skillId}'`);
    const frontmatter = parseFrontmatter(content, skillId);
    if (frontmatter.name !== skill.id || frontmatter.description.length === 0) {
      throw new DiscoveryError('invalid-skill', `Skill '${skillId}' frontmatter identity is invalid.`);
    }
    selectedSkills.push({ metadata: toPublicSkillMetadata(skill), content });
  }

  warnings.sort();
  const comparePaths = (left: { path: string }, right: { path: string }): number => left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
  const attestationScope = {
    repository: { root: '.' as const },
    manifest: {
      path: MANIFEST_RELATIVE_PATH as '.agents/manifest.json',
      version: manifest.manifestVersion,
      content_digest: discoveryDigestFor('conxian-agent-discovery.manifest-content.v1', manifestFileContent.content),
    },
    registry: {
      path: '.agents/skills/registry.json' as const,
      version: registry.registryVersion,
      content_digest: discoveryDigestFor('conxian-agent-discovery.registry-content.v1', registryFileContent.content),
    },
    context: {
      required: requiredContext.map((entry) => contextAttestation(entry, true)).sort(comparePaths),
      optional: optionalContext.map((entry) => contextAttestation(entry, false)).sort(comparePaths),
    },
    skills: {
      selected: selectedSkills.map(skillAttestation).sort(comparePaths),
    },
  };
  const attestation: DiscoveryAttestation = {
    protocol: DISCOVERY_ATTESTATION_PROTOCOL,
    version: DISCOVERY_ATTESTATION_VERSION,
    ...attestationScope,
    digest: discoveryDigestFor('conxian-agent-discovery.attestation.v1', attestationScope),
  };
  return {
    ok: true,
    protocol: DISCOVERY_PROTOCOL,
    repository: { root: '.' },
    manifest: {
      path: MANIFEST_RELATIVE_PATH,
      version: manifest.manifestVersion,
    },
    context: {
      required: requiredContext,
      optional: optionalContext,
    },
    skills: {
      registry: {
        path: manifest.skills.registry,
        version: registry.registryVersion,
      },
      selected: selectedSkills,
    },
    attestation,
    warnings,
  };
}

export function parseCliArgs(args: readonly string[]): CliOptions {
  let json = false;
  let includeOptional = false;
  let root: string | undefined;
  let help = false;
  const skills: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case '--json':
        json = true;
        break;
      case '--include-optional':
        includeOptional = true;
        break;
      case '--help':
      case '-h':
        help = true;
        break;
      case '--root': {
        const value = args[index + 1];
        if (value === undefined || value.startsWith('--')) {
          throw new DiscoveryError('invalid-arguments', '--root requires a directory value.');
        }
        root = value;
        index += 1;
        break;
      }
      case '--skill': {
        const value = args[index + 1];
        if (value === undefined || value.startsWith('--')) {
          throw new DiscoveryError('invalid-arguments', '--skill requires a skill ID.');
        }
        if (!SKILL_ID_PATTERN.test(value)) {
          throw new DiscoveryError('invalid-arguments', '--skill requires a kebab-case skill ID.');
        }
        skills.push(value);
        index += 1;
        break;
      }
      default:
        throw new DiscoveryError('invalid-arguments', `Unsupported argument '${argument}'.`);
    }
  }

  return { json, includeOptional, root, skills, help };
}

const HELP_TEXT = `Usage: pnpm --silent agent-discovery --json [options]

Options:
  --json                 Emit deterministic machine-readable JSON.
  --root <directory>    Start upward manifest discovery at this directory.
  --include-optional     Include declared optional context files.
  --skill <id>           Select a registered active skill; may be repeated.
  --help                 Show this help text.
`;

function humanSummary(result: DiscoveryResult): string {
  const requiredPaths = result.context.required.map((entry) => entry.path).join(', ');
  const optionalPaths = result.context.optional.map((entry) => entry.path).join(', ') || 'none';
  const skillIds = result.skills.selected.map((skill) => skill.metadata.id).join(', ') || 'none';
  return [
    `Protocol: ${result.protocol} v${result.manifest.version}`,
    `Required context: ${requiredPaths}`,
    `Optional context: ${optionalPaths}`,
    `Selected skills: ${skillIds}`,
    result.warnings.length > 0 ? `Warnings: ${result.warnings.join(' ')}` : '',
  ].filter((line) => line.length > 0).join('\n') + '\n';
}

export function executeCli(args: readonly string[]): CliResult {
  const requestedJson = args.includes('--json');
  try {
    const options = parseCliArgs(args);
    if (options.help) {
      return { exitCode: 0, stdout: HELP_TEXT, stderr: '' };
    }
    const result = discoverRepository(options.root ?? process.cwd(), {
      includeOptional: options.includeOptional,
      skills: options.skills.length > 0 ? options.skills : undefined,
    });
    return {
      exitCode: 0,
      stdout: options.json ? `${JSON.stringify(result, null, 2)}\n` : humanSummary(result),
      stderr: '',
    };
  } catch (error: unknown) {
    const discoveryError = error instanceof DiscoveryError
      ? error
      : new DiscoveryError('internal', 'Agent discovery failed unexpectedly.');
    const errorPayload = {
      ok: false,
      error: {
        code: discoveryError.code,
        message: discoveryError.message,
      },
      warnings: [],
    };
    if (requestedJson) {
      return {
        exitCode: 1,
        stdout: `${JSON.stringify(errorPayload, null, 2)}\n`,
        stderr: '',
      };
    }
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Error [${discoveryError.code}]: ${discoveryError.message}\n`,
    };
  }
}

function main(): void {
  const result = executeCli(process.argv.slice(2));
  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
  process.exitCode = result.exitCode;
}

const invokedScript = process.argv[1] ?? '';
if (invokedScript.endsWith('agent-discovery.ts') || invokedScript.endsWith('agent-discovery.js')) {
  main();
}
