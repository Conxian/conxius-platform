import {
  afterEach,
  test,
} from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import {
  join,
  resolve,
} from 'node:path';
import { tmpdir } from 'node:os';

import {
  AgentManifest,
  DISCOVERY_PROTOCOL,
  DiscoveryError,
  SkillRegistry,
  REQUIRED_CONTEXT_PATHS,
  discoverRepository,
  executeCli,
  isContainedRelativePath,
} from './agent-discovery';

const repositoryRoot = resolve(process.cwd());
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function createFixture(
  mutate?: (manifest: AgentManifest, registry: SkillRegistry, root: string) => void,
): string {
  const root = mkdtempSync(join(tmpdir(), 'conxian-agent-discovery-'));
  temporaryRoots.push(root);
  mkdirSync(join(root, '.agents', 'skills', 'agent-onboarding'), { recursive: true });
  mkdirSync(join(root, 'docs'), { recursive: true });
  mkdirSync(join(root, '.github'), { recursive: true });

  writeFileSync(join(root, 'AGENTS.md'), 'agents-context\n', 'utf8');
  writeFileSync(join(root, 'GOVERNANCE.md'), 'governance-context\n', 'utf8');
  writeFileSync(join(root, 'docs', 'AGENT_ONBOARDING.md'), 'onboarding-context\n', 'utf8');
  writeFileSync(join(root, 'docs', 'SESSION_CONTINUITY.md'), 'continuity-context\n', 'utf8');
  writeFileSync(join(root, '.github', 'REPOSITORY_TAXONOMY.md'), 'taxonomy-context\n', 'utf8');
  writeFileSync(join(root, 'docs', 'optional.md'), 'optional-context\n', 'utf8');
  writeFileSync(
    join(root, '.agents', 'skills', 'agent-onboarding', 'SKILL.md'),
    [
      '---',
      'name: agent-onboarding',
      'description: "Fixture onboarding skill."',
      '---',
      '',
      '# Fixture Skill',
      '',
    ].join('\n'),
    'utf8',
  );

  const manifest: AgentManifest = {
    manifestVersion: '1.0.0',
    protocol: DISCOVERY_PROTOCOL,
    repository: { rootMarker: 'AGENTS.md' },
    context: {
      required: [
        { path: 'AGENTS.md', priority: 10, description: 'Agents' },
        { path: 'GOVERNANCE.md', priority: 20, description: 'Governance' },
        { path: 'docs/AGENT_ONBOARDING.md', priority: 30, description: 'Onboarding' },
        { path: 'docs/SESSION_CONTINUITY.md', priority: 40, description: 'Continuity' },
      ],
      optional: [
        { path: '.github/REPOSITORY_TAXONOMY.md', priority: 50, description: 'Taxonomy' },
        { path: 'docs/optional.md', priority: 60, description: 'Optional' },
      ],
    },
    skills: { registry: '.agents/skills/registry.json' },
  };
  const registry: SkillRegistry = {
    registryVersion: '1.0.0',
    protocol: DISCOVERY_PROTOCOL,
    skills: [
      {
        id: 'agent-onboarding',
        name: 'Agent Onboarding',
        description: 'Fixture onboarding skill.',
        path: '.agents/skills/agent-onboarding/SKILL.md',
        status: 'active',
        default: true,
        activation: 'manual',
        loadPolicy: 'content-only',
        contentFormat: 'markdown-with-frontmatter',
        capabilities: ['onboarding'],
        metadata: { version: '1.0.0', owner: 'platform' },
      },
    ],
  };

  mutate?.(manifest, registry, root);
  writeJson(join(root, '.agents', 'manifest.json'), {
    $schema: '../schemas/agent-manifest.schema.json',
    ...manifest,
  });
  writeJson(join(root, '.agents', 'skills', 'registry.json'), {
    $schema: '../../schemas/agent-skill-registry.schema.json',
    ...registry,
  });
  return root;
}

function expectDiscoveryError(callback: () => unknown, code: string): void {
  assert.throws(callback, (error: unknown) => error instanceof DiscoveryError && error.code === code);
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

test('parses the checked-in manifest and schemas and discovers the real skill', () => {
  const manifest = JSON.parse(readFileSync(join(repositoryRoot, '.agents', 'manifest.json'), 'utf8')) as Record<string, unknown>;
  const registry = JSON.parse(readFileSync(join(repositoryRoot, '.agents', 'skills', 'registry.json'), 'utf8')) as Record<string, unknown>;
  const manifestSchema = JSON.parse(readFileSync(join(repositoryRoot, 'schemas', 'agent-manifest.schema.json'), 'utf8')) as Record<string, unknown>;
  const registrySchema = JSON.parse(readFileSync(join(repositoryRoot, 'schemas', 'agent-skill-registry.schema.json'), 'utf8')) as Record<string, unknown>;

  assert.equal(manifest.manifestVersion, '1.0.0');
  assert.equal(registry.registryVersion, '1.0.0');
  assert.equal(manifestSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(registrySchema.$schema, 'https://json-schema.org/draft/2020-12/schema');

  const result = discoverRepository(repositoryRoot);
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.context.required.map((entry) => entry.path),
    [...REQUIRED_CONTEXT_PATHS],
  );
  assert.deepEqual(result.context.optional, []);
  assert.equal(result.skills.selected.length, 1);
  assert.equal(result.skills.selected[0]?.metadata.id, 'agent-onboarding');
  assert.match(result.skills.selected[0]?.content ?? '', /# Agent Onboarding Skill/);
});

test('reads required context in ascending priority order and optional context only when requested', () => {
  const root = createFixture();
  const requiredOnly = discoverRepository(root);
  assert.deepEqual(
    requiredOnly.context.required.map((entry) => entry.priority),
    [10, 20, 30, 40],
  );
  assert.deepEqual(requiredOnly.context.optional, []);

  const withOptional = discoverRepository(root, { includeOptional: true });
  assert.deepEqual(
    withOptional.context.optional.map((entry) => entry.path),
    ['.github/REPOSITORY_TAXONOMY.md', 'docs/optional.md'],
  );
  assert.deepEqual(withOptional.warnings, []);
});

test('supports upward discovery from nested directories with deterministic JSON output', () => {
  const root = createFixture();
  const nested = join(root, 'nested', 'deeper');
  mkdirSync(nested, { recursive: true });
  const rootOutput = executeCli(['--json', '--root', root]);
  const nestedOutput = executeCli(['--json', '--root', nested]);
  const repeatedOutput = executeCli(['--json', '--root', root]);

  assert.equal(rootOutput.exitCode, 0);
  assert.equal(nestedOutput.exitCode, 0);
  assert.equal(rootOutput.stderr, '');
  assert.equal(rootOutput.stdout, nestedOutput.stdout);
  assert.equal(rootOutput.stdout, repeatedOutput.stdout);
});

test('treats both slash conventions safely when checking relative containment', () => {
  assert.equal(isContainedRelativePath('nested/file.md'), true);
  assert.equal(isContainedRelativePath('nested\\file.md'), true);
  assert.equal(isContainedRelativePath('..\\outside'), false);
  assert.equal(isContainedRelativePath('../outside'), false);
  assert.equal(isContainedRelativePath('nested/./file.md'), false);
  assert.equal(isContainedRelativePath('nested//file.md'), false);
});

test('loads an explicitly selected active skill without executing it', () => {
  const root = createFixture();
  const result = executeCli(['--json', '--root', root, '--skill', 'agent-onboarding']);
  assert.equal(result.exitCode, 0);
  const parsed = JSON.parse(result.stdout) as { skills: { selected: Array<{ metadata: { id: string }; content: string }> } };
  assert.deepEqual(parsed.skills.selected.map((skill) => skill.metadata.id), ['agent-onboarding']);
  assert.match(parsed.skills.selected[0]?.content ?? '', /# Fixture Skill/);
});

test('rejects duplicate context paths and duplicate skill IDs', () => {
  const duplicateContext = createFixture((manifest) => {
    manifest.context.required[1] = { ...manifest.context.required[0], priority: 20 };
  });
  expectDiscoveryError(() => discoverRepository(duplicateContext), 'duplicate-entry');

  const duplicateSkills = createFixture((_manifest, registry) => {
    registry.skills.push({ ...registry.skills[0] });
  });
  expectDiscoveryError(() => discoverRepository(duplicateSkills), 'duplicate-entry');
});

test('rejects non-ascending and duplicate context priorities', () => {
  const nonAscending = createFixture((manifest) => {
    manifest.context.required[2] = { ...manifest.context.required[2], priority: 15 };
  });
  expectDiscoveryError(() => discoverRepository(nonAscending), 'invalid-priority');

  const duplicatePriority = createFixture((manifest) => {
    manifest.context.required[1] = { ...manifest.context.required[1], priority: 10 };
  });
  expectDiscoveryError(() => discoverRepository(duplicatePriority), 'duplicate-entry');

  const duplicateAcrossLists = createFixture((manifest) => {
    manifest.context.optional[0] = { ...manifest.context.optional[0], priority: 40 };
  });
  expectDiscoveryError(() => discoverRepository(duplicateAcrossLists), 'duplicate-entry');

  const optionalOutOfOrder = createFixture((manifest) => {
    manifest.context.optional[0] = { ...manifest.context.optional[0], priority: 35 };
  });
  expectDiscoveryError(() => discoverRepository(optionalOutOfOrder), 'invalid-priority');
});

test('rejects duplicate registry skill paths and capabilities', () => {
  const duplicatePath = createFixture((_manifest, registry) => {
    registry.skills.push({
      ...registry.skills[0],
      id: 'second-skill',
      name: 'Second Skill',
      description: 'Second fixture skill.',
      capabilities: ['second-capability'],
    });
  });
  expectDiscoveryError(() => discoverRepository(duplicatePath), 'duplicate-entry');

  const duplicateCapabilities = createFixture((_manifest, registry) => {
    registry.skills[0] = {
      ...registry.skills[0],
      capabilities: ['onboarding', 'onboarding'],
    };
  });
  expectDiscoveryError(() => discoverRepository(duplicateCapabilities), 'duplicate-entry');
});

test('rejects absolute and traversal paths', () => {
  const absolutePath = createFixture((manifest) => {
    manifest.context.required[0] = {
      ...manifest.context.required[0],
      path: '/tmp/secret.txt',
    };
  });
  expectDiscoveryError(() => discoverRepository(absolutePath), 'unsafe-path');

  const traversalPath = createFixture((manifest) => {
    manifest.context.required[0] = {
      ...manifest.context.required[0],
      path: '../secret.txt',
    };
  });
  expectDiscoveryError(() => discoverRepository(traversalPath), 'unsafe-path');
});

test('rejects symlinks that escape the repository root', () => {
  const root = createFixture();
  const outside = mkdtempSync(join(tmpdir(), 'conxian-agent-discovery-outside-'));
  temporaryRoots.push(outside);
  const outsideFile = join(outside, 'outside.md');
  writeFileSync(outsideFile, 'outside-secret\n', 'utf8');
  const inRootFile = join(root, 'docs', 'AGENT_ONBOARDING.md');
  unlinkSync(inRootFile);
  symlinkSync(outsideFile, inRootFile);

  expectDiscoveryError(() => discoverRepository(root), 'unsafe-path');
});

test('allows symlinks that resolve within the repository root when supported', (context) => {
  const root = createFixture();
  const inRootFile = join(root, 'docs', 'AGENT_ONBOARDING.md');
  unlinkSync(inRootFile);
  try {
    symlinkSync(join(root, 'docs', 'SESSION_CONTINUITY.md'), inRootFile);
  } catch (error: unknown) {
    const code = getErrorCode(error);
    if (code !== undefined && ['EACCES', 'EINVAL', 'ENOTSUP', 'EPERM'].includes(code)) {
      context.skip(`Symlinks are not supported in this environment (${code}).`);
      return;
    }
    throw error;
  }

  const result = discoverRepository(root);
  assert.equal(result.context.required[2]?.content, 'continuity-context\n');
});

test('fails closed for missing required context and warns for missing optional context', () => {
  const requiredMissing = createFixture();
  unlinkSync(join(requiredMissing, 'GOVERNANCE.md'));
  expectDiscoveryError(() => discoverRepository(requiredMissing), 'missing-required');

  const optionalMissing = createFixture();
  unlinkSync(join(optionalMissing, 'docs', 'optional.md'));
  const withoutOptional = discoverRepository(optionalMissing);
  assert.deepEqual(withoutOptional.context.optional, []);
  assert.deepEqual(withoutOptional.warnings, ["Optional context file 'docs/optional.md' is missing."]);

  const result = discoverRepository(optionalMissing, { includeOptional: true });
  assert.equal(result.ok, true);
  assert.deepEqual(result.context.optional.map((entry) => entry.path), ['.github/REPOSITORY_TAXONOMY.md']);
  assert.deepEqual(result.warnings, ["Optional context file 'docs/optional.md' is missing."]);
});

test('rejects unsupported manifest and registry major versions', () => {
  const unsupportedManifest = createFixture((manifest) => {
    manifest.manifestVersion = '2.0.0';
  });
  expectDiscoveryError(() => discoverRepository(unsupportedManifest), 'unsupported-major');

  const unsupportedRegistry = createFixture((_manifest, registry) => {
    registry.registryVersion = '2.0.0';
  });
  expectDiscoveryError(() => discoverRepository(unsupportedRegistry), 'unsupported-major');
});

test('rejects malformed manifest and registry JSON', () => {
  const malformedManifest = createFixture();
  writeFileSync(join(malformedManifest, '.agents', 'manifest.json'), '{ malformed\n', 'utf8');
  expectDiscoveryError(() => discoverRepository(malformedManifest), 'invalid-json');

  const malformedRegistry = createFixture();
  writeFileSync(
    join(malformedRegistry, '.agents', 'skills', 'registry.json'),
    '{ malformed\n',
    'utf8',
  );
  expectDiscoveryError(() => discoverRepository(malformedRegistry), 'invalid-json');
});

test('rejects invalid selected skill frontmatter', () => {
  const root = createFixture((_manifest, _registry, fixtureRoot) => {
    writeFileSync(
      join(fixtureRoot, '.agents', 'skills', 'agent-onboarding', 'SKILL.md'),
      '# Missing frontmatter\n',
      'utf8',
    );
  });
  expectDiscoveryError(() => discoverRepository(root), 'invalid-skill');
});

test('requires active default skills', () => {
  const inactiveDefault = createFixture((_manifest, registry) => {
    registry.skills[0] = { ...registry.skills[0], status: 'inactive' };
  });
  expectDiscoveryError(() => discoverRepository(inactiveDefault), 'invalid-contract');

  const noDefault = createFixture((_manifest, registry) => {
    registry.skills[0] = { ...registry.skills[0], default: false };
  });
  expectDiscoveryError(() => discoverRepository(noDefault), 'invalid-contract');
});

test('rejects duplicate repeated skill selections explicitly', () => {
  const root = createFixture();
  const result = executeCli([
    '--json',
    '--root',
    root,
    '--skill',
    'agent-onboarding',
    '--skill',
    'agent-onboarding',
  ]);
  assert.equal(result.exitCode, 1);
  const parsed = JSON.parse(result.stdout) as { error: { code: string } };
  assert.equal(parsed.error.code, 'duplicate-entry');
});

test('rejects unknown CLI flags and missing option values', () => {
  const unknownFlag = executeCli(['--json', '--unknown']);
  assert.equal(unknownFlag.exitCode, 1);
  assert.equal((JSON.parse(unknownFlag.stdout) as { error: { code: string } }).error.code, 'invalid-arguments');

  const missingRoot = executeCli(['--json', '--root']);
  assert.equal(missingRoot.exitCode, 1);
  assert.equal((JSON.parse(missingRoot.stdout) as { error: { code: string } }).error.code, 'invalid-arguments');

  const missingSkill = executeCli(['--json', '--skill']);
  assert.equal(missingSkill.exitCode, 1);
  assert.equal((JSON.parse(missingSkill.stdout) as { error: { code: string } }).error.code, 'invalid-arguments');
});

test('does not read or emit unlisted sensitive files', () => {
  const root = createFixture();
  const secretPath = join(root, '.env.secret');
  writeFileSync(secretPath, 'UNLISTED_SECRET_VALUE\n', 'utf8');
  const result = executeCli(['--json', '--root', root]);
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout.includes('UNLISTED_SECRET_VALUE'), false);
  assert.equal(result.stdout.includes('.env.secret'), false);
  assert.equal(existsSync(secretPath), true);
});

test('returns structured JSON errors without host-absolute paths', () => {
  const result = executeCli(['--json', '--root', join(repositoryRoot, 'missing-directory')]);
  assert.equal(result.exitCode, 1);
  assert.equal(result.stderr, '');
  const parsed = JSON.parse(result.stdout) as { ok: boolean; error: { code: string; message: string } };
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error.code, 'invalid-root');
  assert.equal(parsed.error.message.includes(repositoryRoot), false);
});
