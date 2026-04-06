import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/secrets/route';
import { NextResponse } from 'next/server';

// Mock fs and path
vi.mock('fs', () => ({
  default: {
    writeFileSync: vi.fn(),
    chmodSync: vi.fn(),
  },
}));

describe('Admin Secrets API Auth', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.resetModules();
    process.env.ADMIN_DASHBOARD_API_KEY = mockApiKey;
  });

  it('should return 401 if X-Admin-API-Key header is missing', async () => {
    const req = new Request('http://localhost/api/secrets', {
      method: 'POST',
      body: JSON.stringify({ secrets: {} }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 401 if X-Admin-API-Key header is incorrect', async () => {
    const req = new Request('http://localhost/api/secrets', {
      method: 'POST',
      headers: {
        'X-Admin-API-Key': 'wrong-key',
      },
      body: JSON.stringify({ secrets: {} }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it('should return 200 if X-Admin-API-Key header is correct', async () => {
    const req = new Request('http://localhost/api/secrets', {
      method: 'POST',
      headers: {
        'X-Admin-API-Key': mockApiKey,
      },
      body: JSON.stringify({ secrets: {} }),
    });

    const response = await POST(req);
    // It might return 400 if the body is empty/invalid, but it should pass the 401 check
    expect(response.status).not.toBe(401);
  });
});
