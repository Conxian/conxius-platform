import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { M2MAuthenticator, M2MConfig, validateM2MAuth, validateM2MAuthWithScope, validateAdminAuth } from '../lib/support/m2m';

// Mock environment factory - called each time the mock is accessed
const mockEnv = {
  ADMIN_DASHBOARD_API_KEY: 'test-admin-key',
  SERVICE_KEY_GATEWAY: 'test-gateway-key',
  SERVICE_KEY_ELIZAOS: 'test-elizaos-key',
  SERVICE_KEY_NEXUS: 'test-nexus-key',
  GATEWAY_JWT_SECRET: 'test-jwt-secret',
  EXTERNAL_API_KEYS: JSON.stringify({
    'external-key-1': ['read:admin', 'read:metrics'],
    'external-key-2': ['read:treasury'],
  }),
};

describe('M2M Authentication', () => {
  let authenticator: M2MAuthenticator;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.env before each test
    vi.stubGlobal('process', {
      ...process,
      env: {
        ...process.env,
        ...mockEnv,
      },
    });
    // Reset singleton before each test to pick up mocked environment
    M2MConfig.resetInstance();
    authenticator = new M2MAuthenticator();
  });

  afterEach(() => {
    // Restore process.env after each test
    vi.unstubAllGlobals();
  });

  describe('API Key Validation', () => {
    it('should validate correct API key', () => {
      const result = authenticator.validateApiKey('test-admin-key');
      expect(result.valid).toBe(true);
      expect(result.source).toBe('api-key');
      expect(result.scopes).toContain('m2m:internal');
    });

    it('should reject incorrect API key', () => {
      const result = authenticator.validateApiKey('wrong-key');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should reject missing API key', () => {
      const result = authenticator.validateApiKey(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing API key');
    });
  });

  describe('Service Key Validation', () => {
    it('should validate correct service key for gateway', () => {
      const result = authenticator.validateServiceKey('gateway:test-gateway-key');
      expect(result.valid).toBe(true);
      expect(result.serviceId).toBe('gateway');
      expect(result.source).toBe('service-key');
      expect(result.scopes).toContain('read:admin');
      expect(result.scopes).toContain('m2m:internal');
    });

    it('should validate correct service key for elizaos', () => {
      const result = authenticator.validateServiceKey('elizaos:test-elizaos-key');
      expect(result.valid).toBe(true);
      expect(result.serviceId).toBe('elizaos');
      expect(result.scopes).toContain('read:governance');
    });

    it('should validate correct service key for nexus', () => {
      const result = authenticator.validateServiceKey('nexus:test-nexus-key');
      expect(result.valid).toBe(true);
      expect(result.serviceId).toBe('nexus');
      expect(result.scopes).toContain('write:governance');
    });

    it('should reject incorrect service key', () => {
      const result = authenticator.validateServiceKey('gateway:wrong-key');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid service key');
    });

    it('should reject unknown service ID', () => {
      const result = authenticator.validateServiceKey('unknown-service:test-key');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown service ID');
    });

    it('should reject missing service key', () => {
      const result = authenticator.validateServiceKey(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing service key');
    });

    it('should reject malformed service key format', () => {
      const result = authenticator.validateServiceKey('invalid-format');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid service key format');
    });
  });

  describe('External Key Validation', () => {
    it('should validate correct external key with scopes', () => {
      const result = authenticator.validateExternalKey('external-key-1');
      expect(result.valid).toBe(true);
      expect(result.serviceId).toBe('external');
      expect(result.source).toBe('external-key');
      expect(result.scopes).toEqual(['read:admin', 'read:metrics']);
    });

    it('should validate external key with single scope', () => {
      const result = authenticator.validateExternalKey('external-key-2');
      expect(result.valid).toBe(true);
      expect(result.scopes).toEqual(['read:treasury']);
    });

    it('should reject unknown external key', () => {
      const result = authenticator.validateExternalKey('unknown-external-key');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown external key');
    });

    it('should reject missing external key', () => {
      const result = authenticator.validateExternalKey(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing external key');
    });
  });

  describe('Authenticate Method', () => {
    it('should authenticate using API key', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Admin-API-Key': 'test-admin-key' },
      });
      const result = authenticator.authenticate(request);
      expect(result.valid).toBe(true);
      expect(result.source).toBe('api-key');
    });

    it('should authenticate using service key', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Service-Key': 'gateway:test-gateway-key' },
      });
      const result = authenticator.authenticate(request);
      expect(result.valid).toBe(true);
      expect(result.source).toBe('service-key');
    });

    it('should authenticate using external key', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-External-Key': 'external-key-1' },
      });
      const result = authenticator.authenticate(request);
      expect(result.valid).toBe(true);
      expect(result.source).toBe('external-key');
    });

    it('should return first valid auth (API key takes precedence)', async () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'X-Admin-API-Key': 'test-admin-key',
          'X-Service-Key': 'gateway:test-gateway-key',
        },
      });
      const result = authenticator.authenticate(request);
      expect(result.valid).toBe(true);
      expect(result.source).toBe('api-key');
    });
  });

  describe('Scope Checking', () => {
    it('should check if auth result has required scope', () => {
      const result = authenticator.validateServiceKey('gateway:test-gateway-key');
      expect(result.valid).toBe(true);
      
      expect(authenticator.hasScope(result, 'read:admin')).toBe(true);
      expect(authenticator.hasScope(result, 'read:metrics')).toBe(true);
      expect(authenticator.hasScope(result, 'write:admin')).toBe(false);
      expect(authenticator.hasScope(result, 'admin:secrets')).toBe(false);
    });

    it('should return false for invalid auth result', () => {
      const invalidResult = { valid: false, error: 'test' };
      expect(authenticator.hasScope(invalidResult, 'read:admin')).toBe(false);
    });
  });

  describe('validateM2MAuth', () => {
    it('should return null for valid auth', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Admin-API-Key': 'test-admin-key' },
      });
      const response = validateM2MAuth(request);
      expect(response).toBeNull();
    });

    it('should return 401 for invalid auth', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Admin-API-Key': 'wrong-key' },
      });
      const response = validateM2MAuth(request);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(401);
    });

    it('should return 401 for missing auth', () => {
      const request = new Request('http://localhost/api/test');
      const response = validateM2MAuth(request);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(401);
    });
  });

  describe('validateM2MAuthWithScope', () => {
    it('should return null and auth result for valid auth with scope', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Service-Key': 'gateway:test-gateway-key' },
      });
      const { response, auth } = validateM2MAuthWithScope(request, 'read:admin');
      expect(response).toBeNull();
      expect(auth.valid).toBe(true);
      expect(auth.serviceId).toBe('gateway');
    });

    it('should return 403 for valid auth without required scope', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Service-Key': 'gateway:test-gateway-key' },
      });
      const { response, auth } = validateM2MAuthWithScope(request, 'admin:secrets');
      expect(response).not.toBeNull();
      expect(response!.status).toBe(403);
      expect(auth.valid).toBe(true);
    });

    it('should return 401 for invalid auth', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Admin-API-Key': 'wrong-key' },
      });
      const { response, auth } = validateM2MAuthWithScope(request, 'read:admin');
      expect(response).not.toBeNull();
      expect(response!.status).toBe(401);
      expect(auth.valid).toBe(false);
    });
  });

  describe('Legacy Compatibility', () => {
    it('should support validateAdminAuth via M2M module', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Admin-API-Key': 'test-admin-key' },
      });
      const response = validateAdminAuth(request);
      expect(response).toBeNull();
    });

    it('should return 401 for invalid admin auth', () => {
      const request = new Request('http://localhost/api/test', {
        headers: { 'X-Admin-API-Key': 'wrong-key' },
      });
      const response = validateAdminAuth(request);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(401);
    });
  });

  describe('Service Permission Matrix', () => {
    const testCases: Array<{ service: string; key: string; expectedScopes: string[]; forbiddenScopes: string[] }> = [
      {
        service: 'gateway',
        key: 'test-gateway-key',
        expectedScopes: ['read:admin', 'read:governance', 'read:treasury', 'read:metrics', 'm2m:internal'],
        forbiddenScopes: ['write:admin', 'admin:secrets'],
      },
      {
        service: 'elizaos',
        key: 'test-elizaos-key',
        expectedScopes: ['read:admin', 'read:governance', 'read:metrics', 'm2m:internal'],
        forbiddenScopes: ['write:governance', 'admin:deploy'],
      },
      {
        service: 'nexus',
        key: 'test-nexus-key',
        expectedScopes: ['read:governance', 'read:treasury', 'read:metrics', 'write:governance', 'm2m:internal'],
        forbiddenScopes: ['write:admin', 'admin:secrets'],
      },
    ];

    testCases.forEach(({ service, key, expectedScopes, forbiddenScopes }) => {
      it(`should have correct scopes for ${service}`, () => {
        const result = authenticator.validateServiceKey(`${service}:${key}`);
        expect(result.valid).toBe(true);
        
        expectedScopes.forEach(scope => {
          expect(authenticator.hasScope(result, scope as any)).toBe(true);
        });
        
        forbiddenScopes.forEach(scope => {
          expect(authenticator.hasScope(result, scope as any)).toBe(false);
        });
      });
    });
  });
});
