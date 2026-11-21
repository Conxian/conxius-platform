/**
 * Conxian Sovereign Enterprise Installer & Pre-Flight Diagnostic Engine (G-66 & G-67)
 *
 * Provides declarative client installation configuration generation, fail-closed
 * environment validation, M2M token binding, and pre-flight connectivity diagnostics
 * across Gateway, Nexus, Database (Neon/Postgres), RPC nodes, and Enclave KMS surfaces.
 */

import { createLogger } from './logger';

const logger = createLogger('installer');

export type DeploymentTarget = 'nixos' | 'docker-compose' | 'helm' | 'systemd';
export type Environment = 'production' | 'staging' | 'development';

export interface InstallerConfig {
  environment: Environment;
  coreDbUri: string;
  bitcoinRpcUrl: string;
  stacksRpcUrl: string;
  kwilDbUrl?: string;
  m2mToken: string;
  gatewayAdminKey: string;
  gatewayJwtSecret: string;
  enclaveKmsKeyArn?: string;
  /** Base URL of the gateway under test, e.g. http://127.0.0.1:3000 */
  gatewayBaseUrl?: string;
  /** Base URL of the nexus node under test */
  nexusBaseUrl?: string;
  /** Redis connection string used for the cache reachability probe */
  redisUrl?: string;
  /** Optional enclave/KMS HTTP surface */
  enclaveKmsUrl?: string;
  target: DeploymentTarget;
}

export interface InstallerValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ComponentDiagnosticStatus {
  component:
    | 'database'
    | 'gateway'
    | 'nexus'
    | 'cache'
    | 'bitcoin-rpc'
    | 'stacks-rpc'
    | 'enclave'
    | 'm2m-token';
  status: 'healthy' | 'unreachable' | 'misconfigured' | 'unauthorized';
  latencyMs: number;
  details: string;
  version?: string;
}

export interface PreFlightDiagnosticReport {
  passed: boolean;
  overallScore: number;
  components: ComponentDiagnosticStatus[];
  timestampIso: string;
}

/**
 * Validates client installer configuration inputs.
 * Enforces fail-closed validation on required URIs, RPC URLs, and security tokens.
 */
export function validateInstallerConfig(config: Partial<InstallerConfig>): InstallerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.environment) {
    errors.push('Missing environment specification (production | staging | development).');
  }

  if (!config.coreDbUri) {
    errors.push('Missing coreDbUri (PostgreSQL or Neon DB connection string required).');
  } else if (!config.coreDbUri.startsWith('postgres://') && !config.coreDbUri.startsWith('postgresql://')) {
    errors.push('Invalid coreDbUri format: Must start with postgres:// or postgresql://');
  }

  if (!config.bitcoinRpcUrl) {
    errors.push('Missing bitcoinRpcUrl (Bitcoin L1 RPC node endpoint required).');
  } else if (!config.bitcoinRpcUrl.startsWith('http://') && !config.bitcoinRpcUrl.startsWith('https://')) {
    errors.push('Invalid bitcoinRpcUrl format: Must be a valid HTTP or HTTPS URL.');
  }

  if (!config.stacksRpcUrl) {
    errors.push('Missing stacksRpcUrl (Stacks L2 RPC node endpoint required).');
  } else if (!config.stacksRpcUrl.startsWith('http://') && !config.stacksRpcUrl.startsWith('https://')) {
    errors.push('Invalid stacksRpcUrl format: Must be a valid HTTP or HTTPS URL.');
  }

  if (!config.m2mToken) {
    errors.push('Missing m2mToken (Conxian API M2M token required).');
  } else if (!config.m2mToken.startsWith('cx_live_') && !config.m2mToken.startsWith('cx_test_')) {
    errors.push('Invalid m2mToken prefix: Must begin with cx_live_ or cx_test_');
  }

  if (!config.gatewayAdminKey) {
    errors.push('Missing gatewayAdminKey (Gateway administrative API key required).');
  } else if (config.gatewayAdminKey.length < 16) {
    errors.push('Insecure gatewayAdminKey: Must be at least 16 characters in length.');
  }

  if (!config.gatewayJwtSecret) {
    errors.push('Missing gatewayJwtSecret (Gateway JWT secret required).');
  } else if (config.gatewayJwtSecret.length < 32) {
    errors.push('Insecure gatewayJwtSecret: Must be at least 32 characters in length.');
  }

  if (!config.kwilDbUrl) {
    warnings.push('kwilDbUrl not specified; Nexus Glass Node will operate with local fallback state.');
  }

  if (!config.enclaveKmsKeyArn) {
    warnings.push('enclaveKmsKeyArn not specified; hardware enclave signing will run in software mode.');
  }

  const valid = errors.length === 0;

  logger.info(`Validated installer config: valid=${valid}, errors=${errors.length}, warnings=${warnings.length}`);

  return { valid, errors, warnings };
}

/**
 * Generates a deployment manifest object for client infrastructure automation (NixOS/Docker/Helm).
 */
export function generateDeploymentManifest(config: InstallerConfig): Record<string, unknown> {
  const validation = validateInstallerConfig(config);
  if (!validation.valid) {
    throw new Error(`Cannot generate deployment manifest from invalid configuration: ${validation.errors.join('; ')}`);
  }

  return {
    version: '2026.1.0',
    generatedAt: new Date().toISOString(),
    environment: config.environment,
    target: config.target,
    services: {
      gateway: {
        enabled: true,
        jwtSecret: config.gatewayJwtSecret,
        adminKey: config.gatewayAdminKey,
        m2mToken: config.m2mToken,
      },
      nexus: {
        enabled: true,
        kwilUrl: config.kwilDbUrl || 'internal://local-kwil',
        bitcoinRpc: config.bitcoinRpcUrl,
        stacksRpc: config.stacksRpcUrl,
      },
      dashboard: {
        enabled: true,
        coreDbUri: config.coreDbUri,
      },
    },
    security: {
      enclaveKmsArn: config.enclaveKmsKeyArn || 'software-vault',
      tokenPrefix: config.m2mToken.substring(0, 8),
    },
  };
}

/**
 * Executes an end-to-end 6-point pre-flight connectivity diagnostic check across all client assets.
 * Evaluates DB, Gateway, Nexus, RPC nodes, and M2M authorization status before boot.
 */

const DIAG_TIMEOUT_MS = 3000;

type DiagStatus = ComponentDiagnosticStatus['status'];

interface ProbeResult {
  status: DiagStatus;
  latencyMs: number;
  details: string;
}

function isHttpUrl(value?: string): value is string {
  return !!value && (value.startsWith('http://') || value.startsWith('https://'));
}

function defaultPortFor(protocol: string): number {
  if (protocol === 'postgres:' || protocol === 'postgresql:') return 5432;
  if (protocol === 'redis:') return 6379;
  return 0;
}

/**
 * Establishes a real TCP connection. A connection string that merely *looks* valid is not
 * evidence that the endpoint exists, so this never reports healthy without a completed connect.
 */
async function tcpProbe(uri: string | undefined, timeoutMs = DIAG_TIMEOUT_MS): Promise<ProbeResult> {
  if (!uri) {
    return { status: 'misconfigured', latencyMs: 0, details: 'No connection URI configured.' };
  }

  let host: string;
  let port: number;
  try {
    const parsed = new URL(uri);
    host = parsed.hostname;
    port = Number(parsed.port) || defaultPortFor(parsed.protocol);
  } catch {
    return { status: 'misconfigured', latencyMs: 0, details: 'Connection URI is not parseable.' };
  }

  if (!host || !port) {
    return { status: 'misconfigured', latencyMs: 0, details: 'Connection URI has no resolvable host or port.' };
  }

  const started = Date.now();
  try {
    const net = await import('node:net');
    await new Promise<void>((resolve, reject) => {
      const socket = net.connect({ host, port });
      const finish = (error?: Error) => {
        socket.destroy();
        if (error) reject(error);
        else resolve();
      };
      socket.setTimeout(timeoutMs);
      socket.once('connect', () => finish());
      socket.once('timeout', () => finish(new Error(`timed out after ${timeoutMs}ms`)));
      socket.once('error', (error: Error) => finish(error));
    });
    return {
      status: 'healthy',
      latencyMs: Date.now() - started,
      details: `TCP connection to ${host}:${port} established.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const runtimeCannotProbe = /node:net|Cannot find module|not implemented/i.test(message);
    return {
      status: runtimeCannotProbe ? 'misconfigured' : 'unreachable',
      latencyMs: Date.now() - started,
      details: runtimeCannotProbe
        ? 'TCP probing is unavailable in this runtime; the endpoint could not be verified.'
        : `TCP connection to ${host}:${port} failed: ${message}`,
    };
  }
}

async function httpProbe(
  component: ComponentDiagnosticStatus['component'],
  baseUrl: string | undefined,
  path: string,
  fetchImpl: typeof fetch | null,
  timeoutMs = DIAG_TIMEOUT_MS
): Promise<ComponentDiagnosticStatus> {
  if (!isHttpUrl(baseUrl)) {
    return { component, status: 'misconfigured', latencyMs: 0, details: `No HTTP endpoint configured for ${component}.` };
  }
  if (!fetchImpl) {
    return { component, status: 'unreachable', latencyMs: 0, details: `No fetch implementation available; ${component} was not probed.` };
  }

  const started = Date.now();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'GET',
      signal: controller?.signal,
    });
    if (timer) clearTimeout(timer);
    return {
      component,
      status: res.ok ? 'healthy' : 'unreachable',
      latencyMs: Date.now() - started,
      details: `${component} responded HTTP ${res.status}.`,
    };
  } catch (error) {
    if (timer) clearTimeout(timer);
    const message = error instanceof Error ? error.message : String(error);
    return { component, status: 'unreachable', latencyMs: Date.now() - started, details: `${component} probe failed: ${message}` };
  }
}

async function jsonRpcProbe(
  component: ComponentDiagnosticStatus['component'],
  url: string | undefined,
  method: string,
  fetchImpl: typeof fetch | null,
  timeoutMs = DIAG_TIMEOUT_MS
): Promise<ComponentDiagnosticStatus> {
  if (!isHttpUrl(url)) {
    return { component, status: 'misconfigured', latencyMs: 0, details: `No HTTP endpoint configured for ${component}.` };
  }
  if (!fetchImpl) {
    return { component, status: 'unreachable', latencyMs: 0, details: `No fetch implementation available; ${component} was not probed.` };
  }

  const started = Date.now();
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '1.0', id: 'preflight', method, params: [] }),
      signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(timeoutMs) : undefined,
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return { component, status: 'unreachable', latencyMs, details: `${component} responded HTTP ${res.status}.` };
    }
    const body = (await res.json()) as { result?: unknown; error?: unknown };
    if (body.error) {
      return { component, status: 'misconfigured', latencyMs, details: `${component} returned a JSON-RPC error for ${method}.` };
    }
    return { component, status: 'healthy', latencyMs, details: `${component} answered ${method}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { component, status: 'unreachable', latencyMs: Date.now() - started, details: `${component} probe failed: ${message}` };
  }
}

export async function runPreFlightDiagnostics(
  config: InstallerConfig,
  customFetch?: typeof fetch
): Promise<PreFlightDiagnosticReport> {
  const fetchImpl = customFetch || (typeof fetch !== 'undefined' ? fetch : null);
  const components: ComponentDiagnosticStatus[] = [];

  // 1. Database — real TCP reachability. A well-formed URI is not evidence of a live server.
  const db = await tcpProbe(config.coreDbUri);
  components.push({ component: 'database', ...db });

  // 2. Gateway API — the gateway itself. Probing the Stacks node and calling it the gateway
  //    reported a dead gateway as healthy.
  components.push(await httpProbe('gateway', config.gatewayBaseUrl, '/api/v1/health', fetchImpl));

  // 3. Nexus Glass Node
  components.push(await httpProbe('nexus', config.nexusBaseUrl, '/health', fetchImpl));

  // 4. Cache (Redis) reachability
  const cache = await tcpProbe(config.redisUrl, 2000);
  components.push({ component: 'cache', ...cache });

  // 5. Bitcoin L1 RPC — a real JSON-RPC round trip.
  components.push(await jsonRpcProbe('bitcoin-rpc', config.bitcoinRpcUrl, 'getblockcount', fetchImpl));

  // 6. Stacks L2 RPC — a real /v2/info round trip.
  components.push(await httpProbe('stacks-rpc', config.stacksRpcUrl, '/v2/info', fetchImpl));

  // 7. Enclave / KMS surface
  components.push(
    config.enclaveKmsUrl
      ? await httpProbe('enclave', config.enclaveKmsUrl, '/health', fetchImpl)
      : {
          component: 'enclave',
          status: 'misconfigured',
          latencyMs: 0,
          details: 'No enclave KMS endpoint configured; hardware-backed signing is unavailable.',
        }
  );

  // 8. M2M token — format only. Scope enforcement happens at the gateway, not here.
  const m2mStart = Date.now();
  const tokenValid = config.m2mToken.startsWith('cx_live_') || config.m2mToken.startsWith('cx_test_');
  components.push({
    component: 'm2m-token',
    status: tokenValid ? 'healthy' : 'unauthorized',
    latencyMs: Date.now() - m2mStart,
    details: tokenValid
      ? 'M2M token carries a valid prefix (format check only; scopes are enforced by the gateway).'
      : 'M2M token missing valid cx_live_ or cx_test_ prefix.',
  });

  const healthyCount = components.filter((c) => c.status === 'healthy').length;
  const overallScore = Math.round((healthyCount / components.length) * 100);
  const passed = healthyCount === components.length;

  logger.info(`Executed preflight diagnostics: passed=${passed}, score=${overallScore}, healthy=${healthyCount}/${components.length}`);

  return {
    passed,
    overallScore,
    components,
    timestampIso: new Date().toISOString(),
  };
}
