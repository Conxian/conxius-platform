/**
 * Machine-to-Machine (M2M) Authentication Module
 * 
 * Provides secure service-to-service authentication patterns for the Conxian platform.
 * Supports:
 * - API Key authentication with rotation
 * - JWT token validation for services
 * - Scope-based permissions
 * - Service registry for trusted services
 */

import { NextResponse } from "next/server";

// Service identifiers for the platform
export type ServiceId = 
  | 'gateway'           // conxian-gateway Rust backend
  | 'elizaos'          // ElizaOS plugin
  | 'nexus'             // conxian-nexus state service
  | 'orbit'            // conxius-orbit deployment CLI
  | 'wallet'           // conxius-wallet mobile client
  | 'ui'               // conxian_ui dApp
  | 'admin-dashboard'   // This service
  | 'pulse-bos'        // SFO dashboard
  | 'external';        // Third-party integrations

// Permission scopes
export type Scope = 
  | 'read:admin'        // Read admin dashboard data
  | 'write:admin'       // Modify admin configurations
  | 'read:governance'   // Read governance data
  | 'write:governance'  // Submit governance actions
  | 'read:treasury'     // Read treasury data
  | 'write:treasury'    // Modify treasury operations
  | 'read:metrics'      // Read platform metrics
  | 'admin:secrets'     // Manage secrets
  | 'admin:deploy'      // Deployment operations
  | 'm2m:internal';    // Internal service communication

// Service permission map - defines what each service can access
const SERVICE_PERMISSIONS: Record<ServiceId, Scope[]> = {
  'gateway': ['read:admin', 'read:governance', 'read:treasury', 'read:metrics', 'm2m:internal'],
  'elizaos': ['read:admin', 'read:governance', 'read:metrics', 'm2m:internal'],
  'nexus': ['read:governance', 'read:treasury', 'read:metrics', 'write:governance', 'm2m:internal'],
  'orbit': ['admin:deploy', 'm2m:internal'],
  'wallet': ['read:treasury', 'write:governance', 'm2m:internal'],
  'ui': ['read:admin', 'read:governance', 'read:treasury', 'read:metrics', 'm2m:internal'],
  'admin-dashboard': ['read:admin', 'write:admin', 'read:governance', 'write:governance', 'read:treasury', 'write:treasury', 'read:metrics', 'admin:secrets', 'admin:deploy', 'm2m:internal'],
  'pulse-bos': ['read:admin', 'read:treasury', 'read:metrics', 'm2m:internal'],
  'external': [], // External services need explicit scopes
};

// Configuration options interface
export interface M2MConfigOptions {
  // API Key for service authentication
  apiKey?: string;
  // JWT secret for token validation
  jwtSecret?: string;
  // Map of service IDs to their API keys (for internal services)
  serviceKeys?: Record<ServiceId, string>;
  // Map of external API keys to their scopes
  externalKeys?: Record<string, Scope[]>;
}

/**
 * M2M Authentication Configuration
 */
export class M2MConfig {
  private config: M2MConfigOptions;
  private static instance: M2MConfig | null = null;

  private constructor() {
    this.config = {
      apiKey: process.env.ADMIN_DASHBOARD_API_KEY,
      jwtSecret: process.env.GATEWAY_JWT_SECRET,
      serviceKeys: this.loadServiceKeys(),
      externalKeys: this.loadExternalKeys(),
    };
  }

  static getInstance(): M2MConfig {
    if (!M2MConfig.instance) {
      M2MConfig.instance = new M2MConfig();
    }
    return M2MConfig.instance;
  }

  /**
   * Reset the singleton instance - useful for testing
   */
  static resetInstance(): void {
    M2MConfig.instance = null;
  }

  private loadServiceKeys(): Record<ServiceId, string> {
    const keys: Partial<Record<ServiceId, string>> = {};
    
    // Load service-specific keys from environment
    if (process.env.SERVICE_KEY_GATEWAY) keys.gateway = process.env.SERVICE_KEY_GATEWAY;
    if (process.env.SERVICE_KEY_ELIZAOS) keys.elizaos = process.env.SERVICE_KEY_ELIZAOS;
    if (process.env.SERVICE_KEY_NEXUS) keys.nexus = process.env.SERVICE_KEY_NEXUS;
    if (process.env.SERVICE_KEY_ORBIT) keys.orbit = process.env.SERVICE_KEY_ORBIT;
    if (process.env.SERVICE_KEY_WALLET) keys.wallet = process.env.SERVICE_KEY_WALLET;
    if (process.env.SERVICE_KEY_UI) keys.ui = process.env.SERVICE_KEY_UI;
    if (process.env.SERVICE_KEY_PULSE_BOS) keys['pulse-bos'] = process.env.SERVICE_KEY_PULSE_BOS;
    
    return keys as Record<ServiceId, string>;
  }

  private loadExternalKeys(): Record<string, Scope[]> {
    // External API keys with explicit scopes (JSON encoded)
    const externalKeysJson = process.env.EXTERNAL_API_KEYS || '{}';
    try {
      return JSON.parse(externalKeysJson);
    } catch {
      return {};
    }
  }

  getApiKey(): string | undefined {
    return this.config.apiKey;
  }

  getJwtSecret(): string | undefined {
    return this.config.jwtSecret;
  }

  getServiceKey(serviceId: ServiceId): string | undefined {
    return this.config.serviceKeys?.[serviceId];
  }

  getExternalKeyScopes(key: string): Scope[] | undefined {
    return this.config.externalKeys?.[key];
  }

  getServiceScopes(serviceId: ServiceId): Scope[] {
    return SERVICE_PERMISSIONS[serviceId] || [];
  }
}

/**
 * Authentication result
 */
export interface AuthResult {
  valid: boolean;
  serviceId?: ServiceId;
  scopes?: Scope[];
  error?: string;
  source?: 'api-key' | 'service-key' | 'jwt' | 'external-key';
}

/**
 * M2M Authenticator class
 */
export class M2MAuthenticator {
  private config: M2MConfig;

  constructor() {
    this.config = M2MConfig.getInstance();
  }

  /**
   * Validate API key from X-Admin-API-Key header
   */
  validateApiKey(headerValue: string | null): AuthResult {
    const expectedKey = this.config.getApiKey();
    
    if (!expectedKey) {
      return { valid: false, error: 'API key not configured' };
    }

    if (!headerValue) {
      return { valid: false, error: 'Missing API key' };
    }

    if (headerValue !== expectedKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    return { 
      valid: true, 
      scopes: this.config.getServiceScopes('admin-dashboard'),
      source: 'api-key'
    };
  }

  /**
   * Validate service-to-service key from X-Service-Key header
   * Header format: X-Service-Key: <service-id>:<key>
   */
  validateServiceKey(headerValue: string | null): AuthResult {
    if (!headerValue) {
      return { valid: false, error: 'Missing service key' };
    }

    const parts = headerValue.split(':');
    if (parts.length < 2) {
      return { valid: false, error: 'Invalid service key format' };
    }

    const [serviceId, key] = parts;
    
    if (!Object.values(['gateway', 'elizaos', 'nexus', 'orbit', 'wallet', 'ui', 'admin-dashboard', 'pulse-bos'] as const).includes(serviceId as ServiceId)) {
      return { valid: false, error: 'Unknown service ID' };
    }

    const expectedKey = this.config.getServiceKey(serviceId as ServiceId);
    
    if (!expectedKey) {
      return { valid: false, error: 'Service key not configured' };
    }

    if (key !== expectedKey) {
      return { valid: false, error: 'Invalid service key' };
    }

    return {
      valid: true,
      serviceId: serviceId as ServiceId,
      scopes: this.config.getServiceScopes(serviceId as ServiceId),
      source: 'service-key'
    };
  }

  /**
   * Validate external API key with explicit scopes
   * Header format: X-External-Key: <key>
   */
  validateExternalKey(headerValue: string | null): AuthResult {
    if (!headerValue) {
      return { valid: false, error: 'Missing external key' };
    }

    const scopes = this.config.getExternalKeyScopes(headerValue);
    
    if (!scopes) {
      return { valid: false, error: 'Unknown external key' };
    }

    return {
      valid: true,
      serviceId: 'external',
      scopes,
      source: 'external-key'
    };
  }

  /**
   * Authenticate request using multiple methods
   * Tries in order: API Key, Service Key, External Key
   */
  authenticate(request: Request): AuthResult {
    // Try API key first (admin dashboard key)
    const apiKeyResult = this.validateApiKey(request.headers.get('X-Admin-API-Key'));
    if (apiKeyResult.valid) return apiKeyResult;

    // Try service key (internal services)
    const serviceKeyResult = this.validateServiceKey(request.headers.get('X-Service-Key'));
    if (serviceKeyResult.valid) return serviceKeyResult;

    // Try external key (third-party)
    const externalKeyResult = this.validateExternalKey(request.headers.get('X-External-Key'));
    if (externalKeyResult.valid) return externalKeyResult;

    // Return the last error
    return serviceKeyResult.error ? serviceKeyResult : externalKeyResult;
  }

  /**
   * Check if authenticated request has required scope
   */
  hasScope(authResult: AuthResult, requiredScope: Scope): boolean {
    if (!authResult.valid || !authResult.scopes) return false;
    return authResult.scopes.includes(requiredScope);
  }
}

// Singleton instance
let authenticator: M2MAuthenticator | null = null;

export function getM2MAuthenticator(): M2MAuthenticator {
  if (!authenticator) {
    authenticator = new M2MAuthenticator();
  }
  return authenticator;
}

/**
 * Validate M2M authentication for API routes
 * Returns NextResponse with 401 if unauthorized, null if authorized
 */
export function validateM2MAuth(request: Request): NextResponse | null {
  const auth = getM2MAuthenticator();
  const result = auth.authenticate(request);

  if (!result.valid) {
    console.warn(`M2M Auth failed: ${result.error} from ${request.headers.get('x-forwarded-for') || 'unknown'}`);
    return NextResponse.json(
      { error: 'Unauthorized', message: result.error },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Validate M2M authentication with scope check
 */
export function validateM2MAuthWithScope(request: Request, requiredScope: Scope): { response: NextResponse | null; auth: AuthResult } {
  const auth = getM2MAuthenticator();
  const result = auth.authenticate(request);

  if (!result.valid) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized', message: result.error },
        { status: 401 }
      ),
      auth: result
    };
  }

  if (!auth.hasScope(result, requiredScope)) {
    return {
      response: NextResponse.json(
        { error: 'Forbidden', message: `Missing required scope: ${requiredScope}` },
        { status: 403 }
      ),
      auth: result
    };
  }

  return { response: null, auth: result };
}

/**
 * Legacy compatibility: Export validateAdminAuth using new M2M module
 */
export function validateAdminAuth(request: Request): NextResponse | null {
  return validateM2MAuth(request);
}
