import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { POST as postSecrets } from '../app/api/secrets/route';
import { GET as getMetrics } from '../app/api/metrics/route';

// Mock fs and path
vi.mock('fs', () => ({
  default: {
    writeFileSync: vi.fn(),
    chmodSync: vi.fn(),
  },
}));

describe('Admin API Auth (CON-353)', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.resetModules();
    process.env.ADMIN_DASHBOARD_API_KEY = mockApiKey;
  });

  describe('Secrets API', () => {
    it('should return 401 if X-Admin-API-Key header is missing', async () => {
      const req = new Request('http://localhost/api/secrets', {
        method: 'POST',
        body: JSON.stringify({ secrets: {} }),
      });
      const response = await postSecrets(req);
      expect(response.status).toBe(401);
    });

    it('should return 401 if X-Admin-API-Key header is incorrect', async () => {
      const req = new Request('http://localhost/api/secrets', {
        method: 'POST',
        headers: { 'X-Admin-API-Key': 'wrong-key' },
        body: JSON.stringify({ secrets: {} }),
      });
      const response = await postSecrets(req);
      expect(response.status).toBe(401);
    });
  });

  describe('Metrics API', () => {
    it('should return 401 if X-Admin-API-Key header is missing', async () => {
      const req = new Request('http://localhost/api/metrics', { method: 'GET' });
      const response = await getMetrics(req);
      expect(response.status).toBe(401);
    });

    it('should return 200 if X-Admin-API-Key header is correct', async () => {
      const req = new Request('http://localhost/api/metrics', {
        method: 'GET',
        headers: { 'X-Admin-API-Key': mockApiKey }
      });
      const response = await getMetrics(req);
      expect(response.status).toBe(200);
    });
  });
});
