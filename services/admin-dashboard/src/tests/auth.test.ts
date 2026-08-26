import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { POST as postSecrets } from '../app/api/secrets/route';
import { GET as getMetrics } from '../app/api/metrics/route';

// Mock fs and path
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      writeFileSync: vi.fn(),
      chmodSync: vi.fn(),
    },
  };
});

describe('Admin API Auth (CON-353)', () => {
  const mockApiKey = 'test-api-key';
  const scrapePassword = 'test-scrape-password';
  const tempDirectories: string[] = [];

  beforeEach(() => {
    vi.resetModules();
    process.env.ADMIN_DASHBOARD_API_KEY = mockApiKey;
    delete process.env.PROMETHEUS_SCRAPE_PASSWORD_FILE;
  });

  afterEach(() => {
    delete process.env.PROMETHEUS_SCRAPE_PASSWORD_FILE;
    for (const directory of tempDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  describe('Secrets API', () => {
    it('should reject the deprecated local secret writer', async () => {
      const req = new Request('http://localhost/api/secrets', {
        method: 'POST',
        body: JSON.stringify({ secrets: {} }),
      });
      const response = await postSecrets(req);
      expect(response.status).toBe(410);
      expect(await response.json()).toMatchObject({ success: false });
    });
  });

  describe('Metrics API', () => {
    it('should fail closed if neither admin nor scrape authentication is configured', async () => {
      const req = new Request('http://localhost/api/metrics', { method: 'GET' });
      const response = await getMetrics(req);
      expect(response.status).toBe(503);
    });

    it('should return 200 if X-Admin-API-Key header is correct', async () => {
      const req = new Request('http://localhost/api/metrics', {
        method: 'GET',
        headers: { 'X-Admin-API-Key': mockApiKey }
      });
      const response = await getMetrics(req);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
      const payload = await response.text();
      expect(payload).toContain('admin_dashboard_sidl_requests_total');
      expect(payload).toContain('m2m_service_key_registry_ready');
      expect(payload).not.toContain('m2m_service_key_registry_revision');
    });

    it('should return 200 for Prometheus Basic Auth from the provisioned password file', async () => {
      const directory = mkdtempSync(join(tmpdir(), 'conxian-metrics-auth-'));
      tempDirectories.push(directory);
      const passwordPath = join(directory, 'prometheus-scrape.password');
      writeFileSync(passwordPath, `${scrapePassword}\n`, { mode: 0o600 });
      process.env.PROMETHEUS_SCRAPE_PASSWORD_FILE = passwordPath;

      const credentials = Buffer.from(`prometheus:${scrapePassword}`, 'utf8').toString('base64');
      const req = new Request('http://localhost/api/metrics', {
        method: 'GET',
        headers: { Authorization: `Basic ${credentials}` },
      });
      const response = await getMetrics(req);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
    });

    it('should return 401 for invalid Prometheus scrape credentials', async () => {
      const directory = mkdtempSync(join(tmpdir(), 'conxian-metrics-auth-invalid-'));
      tempDirectories.push(directory);
      const passwordPath = join(directory, 'prometheus-scrape.password');
      writeFileSync(passwordPath, `${scrapePassword}\n`, { mode: 0o600 });
      process.env.PROMETHEUS_SCRAPE_PASSWORD_FILE = passwordPath;

      const credentials = Buffer.from('prometheus:wrong-scrape-password', 'utf8').toString('base64');
      const req = new Request('http://localhost/api/metrics', {
        method: 'GET',
        headers: { Authorization: `Basic ${credentials}` },
      });
      const response = await getMetrics(req);

      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toContain('Basic realm="conxian-metrics"');
    });

    it('should fail closed when the Prometheus scrape password file is not configured', async () => {
      const credentials = Buffer.from(`prometheus:${scrapePassword}`, 'utf8').toString('base64');
      const req = new Request('http://localhost/api/metrics', {
        method: 'GET',
        headers: { Authorization: `Basic ${credentials}` },
      });
      const response = await getMetrics(req);

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: 'metrics_scrape_auth_unavailable' });
    });

    it('keeps admin-key access available when scrape auth is not configured', async () => {
      const req = new Request('http://localhost/api/metrics', {
        method: 'GET',
        headers: { 'X-Admin-API-Key': mockApiKey },
      });
      const response = await getMetrics(req);

      expect(response.status).toBe(200);
    });
  });
});
