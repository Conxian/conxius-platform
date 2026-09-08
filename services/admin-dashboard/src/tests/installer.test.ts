import { describe, it, expect } from 'vitest';
import {
  validateInstallerConfig,
  generateDeploymentManifest,
  runPreFlightDiagnostics,
  InstallerConfig,
} from '../lib/support/installer';

describe('Client System Installer & Diagnostics Engine (G-66 & G-67)', () => {
  const validConfig: InstallerConfig = {
    environment: 'production',
    coreDbUri: 'postgresql://neondb_owner:npg_secret123@ep-sparkling-sunset-69236559.us-east-2.aws.neon.tech/neondb?sslmode=require',
    bitcoinRpcUrl: 'https://btc-node.client.internal:8332',
    stacksRpcUrl: 'https://stacks-node.client.internal:20443',
    kwilDbUrl: 'https://kwil-node.client.internal:8080',
    m2mToken: 'cx_live_a1b2c3d4e5f607891011121314151617',
    gatewayAdminKey: 'admin_key_high_entropy_1234567890',
    gatewayJwtSecret: 'jwt_secret_high_entropy_minimum_32_chars_long_12345',
    enclaveKmsKeyArn: 'arn:aws:kms:us-east-2:123456789012:key/abc-123',
    target: 'nixos',
  };

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
    expect(manifest.version).toBe('2026.1.0');
    expect(manifest.environment).toBe('production');
    expect(manifest.target).toBe('nixos');
    expect(manifest.services).toBeDefined();

    const services = manifest.services as Record<string, Record<string, unknown>>;
    expect(services.gateway.enabled).toBe(true);
    expect(services.gateway.m2mToken).toBe(validConfig.m2mToken);
    expect(services.nexus.bitcoinRpc).toBe(validConfig.bitcoinRpcUrl);
    expect(services.dashboard.coreDbUri).toBe(validConfig.coreDbUri);
  });

  it('throws an error when generating a deployment manifest from invalid config', () => {
    expect(() => generateDeploymentManifest({ target: 'docker-compose' } as InstallerConfig)).toThrow(
      /Cannot generate deployment manifest from invalid configuration/
    );
  });

  it('runs pre-flight connectivity diagnostics and passes for a healthy configuration', async () => {
    const mockFetch = async () => new Response(JSON.stringify({ status: 'ready' }), { status: 200 });

    const report = await runPreFlightDiagnostics(validConfig, mockFetch as unknown as typeof fetch);
    expect(report.passed).toBe(true);
    expect(report.overallScore).toBe(100);
    expect(report.components).toHaveLength(6);

    const components = report.components.map((c) => c.component);
    expect(components).toContain('database');
    expect(components).toContain('gateway');
    expect(components).toContain('nexus');
    expect(components).toContain('bitcoin-rpc');
    expect(components).toContain('stacks-rpc');
    expect(components).toContain('m2m-token');

    for (const comp of report.components) {
      expect(comp.status).toBe('healthy');
    }
  });

  it('flags failures when diagnostic probes fail or tokens are unauthorized', async () => {
    const badConfig: InstallerConfig = {
      ...validConfig,
      coreDbUri: 'invalid-uri',
      m2mToken: 'unauthorized_token',
      kwilDbUrl: undefined,
    };

    const mockFetchFail = async () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });

    const report = await runPreFlightDiagnostics(badConfig, mockFetchFail as unknown as typeof fetch);
    expect(report.passed).toBe(false);
    expect(report.overallScore).toBeLessThan(100);

    const dbComp = report.components.find((c) => c.component === 'database');
    expect(dbComp?.status).toBe('misconfigured');

    const gwComp = report.components.find((c) => c.component === 'gateway');
    expect(gwComp?.status).toBe('unreachable');

    const m2mComp = report.components.find((c) => c.component === 'm2m-token');
    expect(m2mComp?.status).toBe('unauthorized');
  });
});
