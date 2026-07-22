/**
* Machine-to-Machine (M2M) Authentication Module
*
* Provides secure service-to-service authentication patterns for the Conxian platform.
* Supports legacy API/service/external keys and short-lived, server-only HS256 JWTs.
*/

import "server-only";

import { randomUUID } from "node:crypto";
import { decodeProtectedHeader, jwtVerify, SignJWT, type JWTPayload } from "jose";
import { NextResponse } from "next/server";

// Service identifiers for the platform.
export const SERVICE_IDS = [
  "gateway",
  "elizaos",
  "nexus",
  "orbit",
  "wallet",
  "ui",
  "admin-dashboard",
  "pulse-bos",
  "external",
] as const;

export type ServiceId = (typeof SERVICE_IDS)[number];
export type JwtServiceId = Exclude<ServiceId, "external">;

// Permission scopes.
export const KNOWN_SCOPES = [
  "read:admin",
  "write:admin",
  "read:governance",
  "write:governance",
  "read:treasury",
  "write:treasury",
  "read:metrics",
  "admin:secrets",
  "admin:deploy",
  "m2m:internal",
] as const;

export type Scope = (typeof KNOWN_SCOPES)[number];

export type GatewayAuthMode = "legacy" | "dual" | "jwt";

export const DEFAULT_JWT_TTL_SECONDS = 300;
export const MIN_JWT_TTL_SECONDS = 60;
export const MAX_JWT_TTL_SECONDS = 900;
export const DEFAULT_JWT_CLOCK_SKEW_SECONDS = 30;
export const MAX_JWT_CLOCK_SKEW_SECONDS = 60;
export const MIN_JWT_SECRET_BYTES = 32;
export const MAX_BEARER_TOKEN_BYTES = 4096;
export const MAX_JTI_LENGTH = 128;

const JWT_ALGORITHM = "HS256" as const;
const JWT_TYPE = "JWT" as const;
const INVALID_BEARER_ERROR = "Invalid bearer token";
const INVALID_JWT_CONFIGURATION_ERROR = "JWT configuration unavailable";

// Service permission map - defines the maximum scopes a service may receive.
export const SERVICE_PERMISSIONS: Readonly<Record<ServiceId, readonly Scope[]>> = {
  gateway: ["read:admin", "read:governance", "read:treasury", "read:metrics", "m2m:internal"],
  elizaos: ["read:admin", "read:governance", "read:metrics", "m2m:internal"],
  nexus: ["read:governance", "read:treasury", "read:metrics", "write:governance", "m2m:internal"],
  orbit: ["admin:deploy", "m2m:internal"],
  wallet: ["read:treasury", "write:governance", "m2m:internal"],
  ui: ["read:admin", "read:governance", "read:treasury", "read:metrics", "m2m:internal"],
  "admin-dashboard": [
    "read:admin",
    "write:admin",
    "read:governance",
    "write:governance",
    "read:treasury",
    "write:treasury",
    "read:metrics",
    "admin:secrets",
    "admin:deploy",
    "m2m:internal",
  ],
  "pulse-bos": ["read:admin", "read:treasury", "read:metrics", "m2m:internal"],
  external: [],
};

export interface M2MConfigOptions {
  apiKey?: string;
  jwtSecret?: string;
  jwtIssuer?: string;
  jwtAudience?: string;
  jwtTtlSeconds?: number;
  jwtClockSkewSeconds?: number;
  gatewayAuthMode?: GatewayAuthMode;
  serviceKeys?: Partial<Record<ServiceId, string>>;
  externalKeys?: Record<string, Scope[]>;
}

export interface M2MJwtConfig {
  readonly secret: string;
  readonly issuer: string;
  readonly audience: string;
  readonly ttlSeconds: number;
  readonly clockSkewSeconds: number;
  readonly gatewayAuthMode: GatewayAuthMode;
}

export interface M2MJwtClaims {
  readonly iss: string;
  readonly aud: string;
  readonly sub: JwtServiceId;
  readonly scope: string;
  readonly iat: number;
  readonly nbf: number;
  readonly exp: number;
  readonly jti: string;
}

export interface M2MJwtHeader {
  readonly alg: typeof JWT_ALGORITHM;
  readonly typ: typeof JWT_TYPE;
}

export interface JwtIssueOptions {
  readonly ttlSeconds?: number;
  readonly nowSeconds?: number;
}

export interface JwtVerifyOptions {
  readonly nowSeconds?: number;
}

export interface IssuedM2MJwt {
  readonly token: string;
  readonly claims: M2MJwtClaims;
}

export interface AuthResult {
  valid: boolean;
  serviceId?: ServiceId;
  scopes?: Scope[];
  error?: string;
  source?: "api-key" | "service-key" | "jwt" | "external-key";
}

export interface BearerTokenParseResult {
  valid: boolean;
  token?: string;
  error?: string;
}

interface ParsedJwtConfiguration {
  readonly value: number | undefined;
  readonly configured: boolean;
}

interface JwtConfigurationResult {
  readonly valid: true;
  readonly config: M2MJwtConfig;
}

interface InvalidJwtConfigurationResult {
  readonly valid: false;
  readonly error: typeof INVALID_JWT_CONFIGURATION_ERROR;
}

type JwtConfigurationValidationResult = JwtConfigurationResult | InvalidJwtConfigurationResult;

interface ScopeValidationResult {
  readonly valid: true;
  readonly scopes: Scope[];
}

interface InvalidScopeValidationResult {
  readonly valid: false;
  readonly error: string;
}

type ScopeResult = ScopeValidationResult | InvalidScopeValidationResult;

function isScope(value: string): value is Scope {
  return (KNOWN_SCOPES as readonly string[]).includes(value);
}

function isGatewayAuthMode(value: string): value is GatewayAuthMode {
  return value === "legacy" || value === "dual" || value === "jwt";
}

function isServiceId(value: string): value is ServiceId {
  return (SERVICE_IDS as readonly string[]).includes(value);
}

function isJwtServiceId(value: string): value is JwtServiceId {
  return isServiceId(value) && value !== "external";
}

function parseIntegerSetting(value: string | undefined, defaultValue: number): ParsedJwtConfiguration {
  if (value === undefined) {
    return { value: defaultValue, configured: false };
  }

  if (!/^-?\d+$/.test(value)) {
    return { value: undefined, configured: true };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    return { value: undefined, configured: true };
  }

  return { value: parsed, configured: true };
}

function parseExternalKeyScopes(value: string | undefined): Record<string, Scope[]> {
  if (!value) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const result: Record<string, Scope[]> = {};
  for (const [key, scopes] of Object.entries(parsed)) {
    if (!Array.isArray(scopes)) continue;

    const normalizedScopes: Scope[] = [];
    const seen = new Set<Scope>();
    let valid = true;
    for (const scope of scopes) {
      if (typeof scope !== "string" || !isScope(scope) || seen.has(scope)) {
        valid = false;
        break;
      }
      seen.add(scope);
      normalizedScopes.push(scope);
    }

    if (valid) result[key] = normalizedScopes;
  }

  return result;
}

function isSafeTokenIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_JTI_LENGTH && !/[\s\u0000-\u001f\u007f]/.test(value);
}

function isIntegerNumericDate(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function invalidAuth(error = INVALID_BEARER_ERROR): AuthResult {
  return { valid: false, error };
}

function invalidJwtConfiguration(): InvalidJwtConfigurationResult {
  return { valid: false, error: INVALID_JWT_CONFIGURATION_ERROR };
}

function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenResponse(requiredScope: Scope): NextResponse {
  return NextResponse.json({ error: "Forbidden", message: `Missing required scope: ${requiredScope}` }, { status: 403 });
}

function getNowSeconds(nowSeconds?: number): number {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(now) || now < 0) {
    throw new Error("M2M JWT time is invalid");
  }
  return now;
}

function parseScopeClaim(scopeClaim: unknown): ScopeResult {
  if (typeof scopeClaim !== "string" || scopeClaim.length === 0 || !/^[^\s]+(?: [^\s]+)*$/.test(scopeClaim)) {
    return { valid: false, error: INVALID_BEARER_ERROR };
  }

  const scopes = scopeClaim.split(" ");
  const normalizedScopes: Scope[] = [];
  const seen = new Set<Scope>();
  for (const scope of scopes) {
    if (!isScope(scope) || seen.has(scope)) {
      return { valid: false, error: INVALID_BEARER_ERROR };
    }
    seen.add(scope);
    normalizedScopes.push(scope);
  }

  return { valid: true, scopes: normalizedScopes.sort() };
}

function validateScopes(serviceId: ServiceId, scopes: readonly Scope[], permissionMap: Readonly<Record<ServiceId, readonly Scope[]>>): ScopeResult {
  if (serviceId === "external" || scopes.length === 0) {
    return { valid: false, error: "JWT scope policy rejected" };
  }

  const normalizedScopes: Scope[] = [];
  const seen = new Set<Scope>();
  const ceiling = new Set(permissionMap[serviceId]);
  for (const scope of scopes) {
    if (!isScope(scope) || seen.has(scope) || !ceiling.has(scope)) {
      return { valid: false, error: "JWT scope policy rejected" };
    }
    seen.add(scope);
    normalizedScopes.push(scope);
  }

  if (!seen.has("m2m:internal")) {
    return { valid: false, error: "JWT scope policy rejected" };
  }

  return { valid: true, scopes: normalizedScopes.sort() };
}

function validateJwtLifetime(iat: number, nbf: number, exp: number, now: number, config: M2MJwtConfig): boolean {
  const lifetime = exp - iat;
  if (lifetime < MIN_JWT_TTL_SECONDS || lifetime > MAX_JWT_TTL_SECONDS) return false;
  if (exp <= iat || nbf > exp) return false;
  if (iat > now + config.clockSkewSeconds) return false;
  if (nbf > now + config.clockSkewSeconds) return false;
  if (exp <= now - config.clockSkewSeconds) return false;
  return true;
}

/** M2M Authentication Configuration. */
export class M2MConfig {
  private config: M2MConfigOptions;
  private readonly jwtTtlSeconds: ParsedJwtConfiguration;
  private readonly jwtClockSkewSeconds: ParsedJwtConfiguration;
  private readonly gatewayAuthMode: GatewayAuthMode | null;
  private static instance: M2MConfig | null = null;

  private constructor() {
    this.config = {
      apiKey: process.env.ADMIN_DASHBOARD_API_KEY,
      jwtSecret: process.env.GATEWAY_JWT_SECRET,
      jwtIssuer: process.env.GATEWAY_JWT_ISSUER,
      jwtAudience: process.env.GATEWAY_JWT_AUDIENCE,
      serviceKeys: this.loadServiceKeys(),
      externalKeys: parseExternalKeyScopes(process.env.EXTERNAL_API_KEYS),
    };
    this.jwtTtlSeconds = parseIntegerSetting(process.env.M2M_JWT_TTL_SECONDS, DEFAULT_JWT_TTL_SECONDS);
    this.jwtClockSkewSeconds = parseIntegerSetting(process.env.M2M_JWT_CLOCK_SKEW_SECONDS, DEFAULT_JWT_CLOCK_SKEW_SECONDS);

    const configuredMode = process.env.M2M_GATEWAY_AUTH_MODE;
    this.gatewayAuthMode = configuredMode === undefined ? "legacy" : isGatewayAuthMode(configuredMode) ? configuredMode : null;
    this.config.gatewayAuthMode = this.gatewayAuthMode ?? undefined;
    this.config.jwtTtlSeconds = this.jwtTtlSeconds.value;
    this.config.jwtClockSkewSeconds = this.jwtClockSkewSeconds.value;
  }

  static getInstance(): M2MConfig {
    if (!M2MConfig.instance) {
      M2MConfig.instance = new M2MConfig();
    }
    return M2MConfig.instance;
  }

  /** Reset the singleton instance. Primarily useful for tests. */
  static resetInstance(): void {
    M2MConfig.instance = null;
  }

  private loadServiceKeys(): Partial<Record<ServiceId, string>> {
    const keys: Partial<Record<ServiceId, string>> = {};
    const environmentKeys: ReadonlyArray<readonly [ServiceId, string]> = [
      ["gateway", "SERVICE_KEY_GATEWAY"],
      ["elizaos", "SERVICE_KEY_ELIZAOS"],
      ["nexus", "SERVICE_KEY_NEXUS"],
      ["orbit", "SERVICE_KEY_ORBIT"],
      ["wallet", "SERVICE_KEY_WALLET"],
      ["ui", "SERVICE_KEY_UI"],
      ["admin-dashboard", "SERVICE_KEY_ADMIN_DASHBOARD"],
      ["pulse-bos", "SERVICE_KEY_PULSE_BOS"],
    ];

    for (const [serviceId, environmentKey] of environmentKeys) {
      const value = process.env[environmentKey];
      if (value) keys[serviceId] = value;
    }

    return keys;
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
    return [...(SERVICE_PERMISSIONS[serviceId] ?? [])];
  }

  getGatewayAuthMode(): GatewayAuthMode | null {
    return this.gatewayAuthMode;
  }

  getJwtConfig(): JwtConfigurationValidationResult {
    const secret = this.config.jwtSecret;
    const issuer = this.config.jwtIssuer;
    const audience = this.config.jwtAudience;
    const ttlSeconds = this.jwtTtlSeconds.value;
    const clockSkewSeconds = this.jwtClockSkewSeconds.value;

    if (
      !secret ||
      new TextEncoder().encode(secret).byteLength < MIN_JWT_SECRET_BYTES ||
      !issuer ||
      issuer.trim().length === 0 ||
      !audience ||
      audience.trim().length === 0 ||
      ttlSeconds === undefined ||
      ttlSeconds < MIN_JWT_TTL_SECONDS ||
      ttlSeconds > MAX_JWT_TTL_SECONDS ||
      clockSkewSeconds === undefined ||
      clockSkewSeconds < 0 ||
      clockSkewSeconds > MAX_JWT_CLOCK_SKEW_SECONDS ||
      this.gatewayAuthMode === null
    ) {
      return invalidJwtConfiguration();
    }

    return {
      valid: true,
      config: {
        secret,
        issuer,
        audience,
        ttlSeconds,
        clockSkewSeconds,
        gatewayAuthMode: this.gatewayAuthMode,
      },
    };
  }
}

/** Parse exactly one compact Bearer token without accepting legacy fallback material. */
export function parseBearerToken(headerValue: string | null): BearerTokenParseResult {
  if (headerValue === null || headerValue.length === 0 || headerValue !== headerValue.trim()) {
    return { valid: false, error: INVALID_BEARER_ERROR };
  }

  const parts = headerValue.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || parts[1].length === 0) {
    return { valid: false, error: INVALID_BEARER_ERROR };
  }

  const token = parts[1];
  if (new TextEncoder().encode(token).byteLength > MAX_BEARER_TOKEN_BYTES) {
    return { valid: false, error: INVALID_BEARER_ERROR };
  }

  const segments = token.split(".");
  if (segments.length !== 3 || segments.some((segment) => !/^[A-Za-z0-9_-]+$/.test(segment))) {
    return { valid: false, error: INVALID_BEARER_ERROR };
  }

  return { valid: true, token };
}

/** M2M Authenticator class. */
export class M2MAuthenticator {
  private readonly config: M2MConfig;

  constructor(config: M2MConfig = M2MConfig.getInstance()) {
    this.config = config;
  }

  /** Validate API key from X-Admin-API-Key header. */
  validateApiKey(headerValue: string | null): AuthResult {
    const expectedKey = this.config.getApiKey();

    if (!expectedKey) {
      return { valid: false, error: "API key not configured" };
    }

    if (!headerValue) {
      return { valid: false, error: "Missing API key" };
    }

    if (headerValue !== expectedKey) {
      return { valid: false, error: "Invalid API key" };
    }

    return {
      valid: true,
      scopes: this.config.getServiceScopes("admin-dashboard"),
      source: "api-key",
    };
  }

  /** Validate service-to-service key from X-Service-Key: <service-id>:<key>. */
  validateServiceKey(headerValue: string | null): AuthResult {
    if (!headerValue) {
      return { valid: false, error: "Missing service key" };
    }

    const parts = headerValue.split(":");
    if (parts.length < 2) {
      return { valid: false, error: "Invalid service key format" };
    }

    const [serviceIdValue, key] = parts;
    if (!isServiceId(serviceIdValue)) {
      return { valid: false, error: "Unknown service ID" };
    }

    const expectedKey = this.config.getServiceKey(serviceIdValue);
    if (!expectedKey) {
      return { valid: false, error: "Service key not configured" };
    }

    if (key !== expectedKey) {
      return { valid: false, error: "Invalid service key" };
    }

    return {
      valid: true,
      serviceId: serviceIdValue,
      scopes: this.config.getServiceScopes(serviceIdValue),
      source: "service-key",
    };
  }

  /** Validate external API key with explicit scopes. */
  validateExternalKey(headerValue: string | null): AuthResult {
    if (!headerValue) {
      return { valid: false, error: "Missing external key" };
    }

    const scopes = this.config.getExternalKeyScopes(headerValue);
    if (!scopes) {
      return { valid: false, error: "Unknown external key" };
    }

    return {
      valid: true,
      serviceId: "external",
      scopes: [...scopes],
      source: "external-key",
    };
  }

  /** Issue a fresh, short-lived JWT for a trusted registered service identity. */
  async issueJwt(serviceId: JwtServiceId, scopes: readonly Scope[], options: JwtIssueOptions = {}): Promise<string> {
    const issued = await this.issueJwtWithMetadata(serviceId, scopes, options);
    return issued.token;
  }

  /** Issue a JWT and return its validated claims for server-side cache management. */
  async issueJwtWithMetadata(serviceId: JwtServiceId, scopes: readonly Scope[], options: JwtIssueOptions = {}): Promise<IssuedM2MJwt> {
    const jwtConfigResult = this.config.getJwtConfig();
    if (!jwtConfigResult.valid || !isJwtServiceId(serviceId)) {
      throw new Error("M2M JWT issuance failed");
    }

    const jwtConfig = jwtConfigResult.config;
    const scopeResult = validateScopes(serviceId, scopes, SERVICE_PERMISSIONS);
    if (!scopeResult.valid) {
      throw new Error("M2M JWT issuance failed");
    }

    const ttlSeconds = options.ttlSeconds ?? jwtConfig.ttlSeconds;
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < MIN_JWT_TTL_SECONDS || ttlSeconds > MAX_JWT_TTL_SECONDS) {
      throw new Error("M2M JWT issuance failed");
    }

    const nowSeconds = getNowSeconds(options.nowSeconds);
    const exp = nowSeconds + ttlSeconds;
    const jti = randomUUID();
    if (!isSafeTokenIdentifier(jti)) {
      throw new Error("M2M JWT issuance failed");
    }

    const claims: M2MJwtClaims = {
      iss: jwtConfig.issuer,
      aud: jwtConfig.audience,
      sub: serviceId,
      scope: scopeResult.scopes.join(" "),
      iat: nowSeconds,
      nbf: nowSeconds,
      exp,
      jti,
    };

    const token = await new SignJWT({ scope: claims.scope })
      .setProtectedHeader({ alg: JWT_ALGORITHM, typ: JWT_TYPE })
      .setIssuer(claims.iss)
      .setAudience(claims.aud)
      .setSubject(claims.sub)
      .setIssuedAt(claims.iat)
      .setNotBefore(claims.nbf)
      .setExpirationTime(claims.exp)
      .setJti(claims.jti)
      .sign(new TextEncoder().encode(jwtConfig.secret));

    return { token, claims };
  }

  /** Verify a compact HS256 JWT and return a normalized M2M AuthResult. */
  async verifyJwt(token: string, options: JwtVerifyOptions = {}): Promise<AuthResult> {
    const jwtConfigResult = this.config.getJwtConfig();
    if (!jwtConfigResult.valid) return invalidAuth(INVALID_JWT_CONFIGURATION_ERROR);

    const parsedBearer = parseBearerToken(`Bearer ${token}`);
    if (!parsedBearer.valid || parsedBearer.token !== token) return invalidAuth();

    const jwtConfig = jwtConfigResult.config;
    const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(nowSeconds) || nowSeconds < 0) return invalidAuth();

    try {
      const protectedHeader = decodeProtectedHeader(token);
      if (protectedHeader.alg !== JWT_ALGORITHM || protectedHeader.typ !== JWT_TYPE || "kid" in protectedHeader) {
        return invalidAuth();
      }

      const verification = await jwtVerify(token, new TextEncoder().encode(jwtConfig.secret), {
        algorithms: [JWT_ALGORITHM],
        audience: jwtConfig.audience,
        issuer: jwtConfig.issuer,
        typ: JWT_TYPE,
        clockTolerance: jwtConfig.clockSkewSeconds,
        currentDate: new Date(nowSeconds * 1000),
      });

      return this.authResultFromVerifiedPayload(verification.payload, nowSeconds, jwtConfig);
    } catch {
      return invalidAuth();
    }
  }

  private authResultFromVerifiedPayload(payload: JWTPayload, nowSeconds: number, jwtConfig: M2MJwtConfig): AuthResult {
    if (
      typeof payload.iss !== "string" ||
      payload.iss !== jwtConfig.issuer ||
      typeof payload.aud !== "string" ||
      payload.aud !== jwtConfig.audience ||
      typeof payload.sub !== "string" ||
      !isJwtServiceId(payload.sub) ||
      !isIntegerNumericDate(payload.iat) ||
      !isIntegerNumericDate(payload.nbf) ||
      !isIntegerNumericDate(payload.exp) ||
      !isSafeTokenIdentifier(payload.jti)
    ) {
      return invalidAuth();
    }

    const scopeResult = parseScopeClaim(payload.scope);
    if (!scopeResult.valid) return invalidAuth();

    const ceilingResult = validateScopes(payload.sub, scopeResult.scopes, SERVICE_PERMISSIONS);
    if (!ceilingResult.valid || !validateJwtLifetime(payload.iat, payload.nbf, payload.exp, nowSeconds, jwtConfig)) {
      return invalidAuth();
    }

    return {
      valid: true,
      serviceId: payload.sub,
      scopes: ceilingResult.scopes,
      source: "jwt",
    };
  }

  /** Authenticate with strict Bearer precedence, then legacy key precedence. */
  async authenticate(request: Request): Promise<AuthResult> {
    const authorization = request.headers.get("Authorization");
    if (authorization !== null) {
      const bearer = parseBearerToken(authorization);
      if (!bearer.valid || !bearer.token) return invalidAuth();
      return this.verifyJwt(bearer.token);
    }

    const apiKeyResult = this.validateApiKey(request.headers.get("X-Admin-API-Key"));
    if (apiKeyResult.valid) return apiKeyResult;

    const serviceKeyResult = this.validateServiceKey(request.headers.get("X-Service-Key"));
    if (serviceKeyResult.valid) return serviceKeyResult;

    const externalKeyResult = this.validateExternalKey(request.headers.get("X-External-Key"));
    if (externalKeyResult.valid) return externalKeyResult;

    return serviceKeyResult.error ? serviceKeyResult : externalKeyResult;
  }

  /** Check if an authenticated request has the required scope. */
  hasScope(authResult: AuthResult, requiredScope: Scope): boolean {
    if (!authResult.valid || !authResult.scopes) return false;
    return authResult.scopes.includes(requiredScope);
  }
}

let authenticator: M2MAuthenticator | null = null;
let authenticatorConfig: M2MConfig | null = null;

export function getM2MAuthenticator(): M2MAuthenticator {
  const config = M2MConfig.getInstance();
  if (!authenticator || authenticatorConfig !== config) {
    authenticator = new M2MAuthenticator(config);
    authenticatorConfig = config;
  }
  return authenticator;
}

export async function issueM2MJwt(serviceId: JwtServiceId, scopes: readonly Scope[], options?: JwtIssueOptions): Promise<string> {
  return getM2MAuthenticator().issueJwt(serviceId, scopes, options);
}

export async function verifyM2MJwt(token: string, options?: JwtVerifyOptions): Promise<AuthResult> {
  return getM2MAuthenticator().verifyJwt(token, options);
}

/** Validate M2M authentication for API routes. */
export async function validateM2MAuth(request: Request): Promise<NextResponse | null> {
  const result = await getM2MAuthenticator().authenticate(request);
  return result.valid ? null : unauthorizedResponse();
}

/** Validate M2M authentication with a scope check, distinguishing 401 from 403. */
export async function validateM2MAuthWithScope(request: Request, requiredScope: Scope): Promise<{ response: NextResponse | null; auth: AuthResult }> {
  const authenticatorInstance = getM2MAuthenticator();
  const result = await authenticatorInstance.authenticate(request);

  if (!result.valid) {
    return { response: unauthorizedResponse(), auth: result };
  }

  if (!authenticatorInstance.hasScope(result, requiredScope)) {
    return { response: forbiddenResponse(requiredScope), auth: result };
  }

  return { response: null, auth: result };
}

/** Legacy M2M-module compatibility guard. */
export async function validateAdminAuth(request: Request): Promise<NextResponse | null> {
  const { response } = await validateM2MAuthWithScope(request, "read:admin");
  return response;
}
