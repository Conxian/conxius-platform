import { describe, it, expect, vi } from 'vitest';
import {
  validateInstallerConfig,
  generateDeploymentManifest,
  runPreFlightDiagnostics,
  GATEWAY_REQUIRED_ENV_KEYS,
  GATEWAY_PERSISTENCE_MODE,
  InstallerConfig,
} from '../lib/support/installer';

describe('Client System Installer & Diagnostics Engine (G-66 & G-67)', () => {
  const validConfig: InstallerConfig = {
    environment: 'production',
    coreDbUri: 'postgresql://db_user:db_password@postgres.client.internal:5432/neondb?sslmode=require',
    bitcoinRpcUrl: 'https://btc-node.client.internal:8332',
    stacksRpcUrl: 'https://stacks-node.client.internal:20443',
    kwilDbUrl: 'https://kwil-node.client.internal:8080',
    m2mToken: 'cx_live_00000000000000000000000000000000',
    gatewayAdminKey: 'admin_key_placeholder_for_tests',
    gatewayJwtSecret: 'jwt_secret_placeholder_for_tests_32_chars',
    enclaveKmsKeyArn: 'arn:aws:kms:us-east-2:000000000000:key/00000000-0000-0000-0000-000000000000',
    gatewayBaseUrl: 'http://127.0.0.1:3000',
    nexusBaseUrl: 'http://127.0.0.1:3001',
    redisUrl: 'redis://127.0.0.1:6379',
    enclaveKmsUrl: 'http://127.0.0.1:8081',
    target: 'nixos',
  };

  const okFetch = async () =>
    new Response(JSON.stringify({ result: 1, status: 'ready' }), { status: 200 });

  it('validates a complete and correct installer configuration', () => {
    const result = validateInstallerConfig(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('rejects incomplete or invalid installer configuration inputs', () => {
    const invalidConfig: Partial<InstallerConfig> = {
      environment: 'production',
      coreDbUri: 'mysql://invalid-db-uri',
      bitcoinRpcUrl: 'invalid-url',
      m2mToken: 'invalid_prefix_token',
      gatewayAdminKey: 'short',
      gatewayJwtSecret: 'short_secret',
    };

    const result = validateInstallerConfig(invalidConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContain('Invalid coreDbUri format: Must start with postgres:// or postgresql://');
    expect(result.errors).toContain('Invalid bitcoinRpcUrl format: Must be a valid HTTP or HTTPS URL.');
    expect(result.errors).toContain('Missing stacksRpcUrl (Stacks L2 RPC node endpoint required).');
    expect(result.errors).toContain('Invalid m2mToken prefix: Must begin with cx_live_ or cx_test_');
    expect(result.errors).toContain('Insecure gatewayAdminKey: Must be at least 16 characters in length.');
    expect(result.errors).toContain('Insecure gatewayJwtSecret: Must be at least 32 characters in length.');
  });

  it('generates a structured deployment manifest for valid installer config', () => {
    const manifest = generateDeploymentManifest(validConfig);
    expect(manifest.version).toBe('2026.2.0');
    expect(manifest.environment).toBe('production');
    expect(manifest.target).toBe('nixos');
    expect(manifest.services).toBeDefined();

    const services = manifest.services as Record<string, Record<string, unknown>>;
    expect(services.gateway.enabled).toBe(true);
    expect(services.gateway.m2mToken).toBe(validConfig.m2mToken);
    expect(services.nexus.bitcoinRpc).toBe(validConfig.bitcoinRpcUrl);
    expect(services.dashboard.coreDbUri).toBe(validConfig.coreDbUri);
  });

  it('emits every secret the gateway refuses to start without', () => {
    const manifest = generateDeploymentManifest(validConfig);
    const services = manifest.services as Record<string, Record<string, unknown>>;
    const env = services.gateway.env as Record<string, string>;

    for (const key of GATEWAY_REQUIRED_ENV_KEYS) {
      expect(typeof env[key]).toBe('string');
      expect(env[key].length).toBeGreaterThanOrEqual(32);
    }
    expect(services.gateway.persistenceMode).toBe(GATEWAY_PERSISTENCE_MODE);
  });

  it('generates a distinct secret per key instead of reusing one value', () => {
    const manifest = generateDeploymentManifest(validConfig);
    const services = manifest.services as Record<string, Record<string, unknown>>;
    const env = services.gateway.env as Record<string, string>;

    const values = GATEWAY_REQUIRED_ENV_KEYS.map((key) => env[key]);
    expect(new Set(values).size).toBe(GATEWAY_REQUIRED_ENV_KEYS.length);
  });

  it('honours supplied gateway secrets and rejects short ones', () => {
    const supplied = 'a'.repeat(40);
    const manifest = generateDeploymentManifest({ ...validConfig, gatewayHmacSecret: supplied });
    const services = manifest.services as Record<string, Record<string, unknown>>;
    expect((services.gateway.env as Record<string, string>).HMAC_SECRET).toBe(supplied);

    expect(() => generateDeploymentManifest({ ...validConfig, gatewayHmacSecret: 'too-short' })).toThrow(
      /HMAC_SECRET/
    );
  });

  it('throws an error when generating a deployment manifest from invalid config', () => {
    expect(() => generateDeploymentManifest({ target: 'docker-compose' } as InstallerConfig)).toThrow(
      /Cannot generate deployment manifest from invalid configuration/
    );
  });

  it('supports a systemd target for bare-metal client installs', () => {
    const manifest = generateDeploymentManifest({ ...validConfig, target: 'systemd' });
    expect(manifest.target).toBe('systemd');
  });

  it('reports every configured component when the probes succeed', async () => {
    const report = await runPreFlightDiagnostics(validConfig, okFetch as unknown as typeof fetch);

    const byName = Object.fromEntries(report.components.map((c) => [c.component, c]));
    expect(Object.keys(byName).sort()).toEqual(
      ['bitcoin-rpc', 'cache', 'database', 'enclave', 'gateway', 'm2m-token', 'nexus', 'stacks-rpc'].sort()
    );

    expect(byName.gateway.status).toBe('healthy');
    expect(byName.nexus.status).toBe('healthy');
    expect(byName['stacks-rpc'].status).toBe('healthy');
    expect(byName['bitcoin-rpc'].status).toBe('healthy');
    expect(byName.enclave.status).toBe('healthy');
    expect(byName['m2m-token'].status).toBe('healthy');
  });

  it('never reports the gateway healthy when the gateway endpoint is not configured', async () => {
    const report = await runPreFlightDiagnostics(
      { ...validConfig, gatewayBaseUrl: undefined },
      okFetch as unknown as typeof fetch
    );

    const gateway = report.components.find((c) => c.component === 'gateway');
    expect(gateway?.status).toBe('misconfigured');
    expect(report.passed).toBe(false);
  });

  it('probes the gateway health path the gateway actually serves', async () => {
    const requested: string[] = [];
    const recordingFetch = async (input: RequestInfo | URL) => {
      requested.push(String(input));
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    };

    await runPreFlightDiagnostics(validConfig, recordingFetch as unknown as typeof fetch);
    expect(requested).toContain('http://127.0.0.1:3000/api/v1/health');
  });

  it('reports a well-formed but unreachable database as unreachable, not healthy', async () => {
    const report = await runPreFlightDiagnostics(
      { ...validConfig, coreDbUri: 'postgresql://user:pass@127.0.0.1:1/nonexistent' },
      okFetch as unknown as typeof fetch
    );

    const database = report.components.find((c) => c.component === 'database');
    expect(database?.status).toBe('unreachable');
    expect(report.passed).toBe(false);
  });

  it('reports an unreachable cache as unreachable', async () => {
    const report = await runPreFlightDiagnostics(
      { ...validConfig, redisUrl: 'redis://127.0.0.1:1' },
      okFetch as unknown as typeof fetch
    );

    const cache = report.components.find((c) => c.component === 'cache');
    expect(cache?.status).toBe('unreachable');
  });

  it('fails closed when the database and services are all dead', async () => {
    const deadConfig: InstallerConfig = {
      ...validConfig,
      coreDbUri: 'postgresql://user:pass@127.0.0.1:1/nonexistent',
      redisUrl: 'redis://127.0.0.1:1',
      gatewayBaseUrl: 'http://127.0.0.1:1',
      nexusBaseUrl: 'http://127.0.0.1:1',
    };

    const report = await runPreFlightDiagnostics(deadConfig, okFetch as unknown as typeof fetch);
    expect(report.passed).toBe(false);
    expect(report.overallScore).toBeLessThan(100);
  });

  it('flags an unauthorized M2M token', async () => {
    const report = await runPreFlightDiagnostics(
      { ...validConfig, m2mToken: 'unauthorized_token' },
      okFetch as unknown as typeof fetch
    );

    const m2m = report.components.find((c) => c.component === 'm2m-token');
    expect(m2m?.status).toBe('unauthorized');
    expect(report.passed).toBe(false);
  });

  it('never reports a probed component healthy when no fetch implementation exists', async () => {
    vi.stubGlobal('fetch', undefined);
    try {
      const report = await runPreFlightDiagnostics(validConfig);
      for (const name of ['gateway', 'nexus', 'stacks-rpc', 'bitcoin-rpc', 'enclave'] as const) {
        const comp = report.components.find((c) => c.component === name);
        expect(comp?.status).not.toBe('healthy');
      }
      expect(report.passed).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
