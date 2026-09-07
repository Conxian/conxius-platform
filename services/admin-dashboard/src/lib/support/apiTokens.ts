import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import { type Scope, SERVICE_PERMISSIONS } from "./m2m";
import { createLogger } from "./logger";

const logger = createLogger("api-tokens");

export type ApiTokenEnvironment = "live" | "test";

export interface ApiTokenMetadata {
  id: string;
  label: string;
  ownerId: string;
  environment: ApiTokenEnvironment;
  prefix: string;
  maskedToken: string;
  scopes: Scope[];
  createdAtIso: string;
  expiresAtIso?: string;
  lastUsedAtIso?: string;
  revoked: boolean;
  revokedAtIso?: string;
}

export interface IssuedApiToken {
  rawToken: string;
  metadata: ApiTokenMetadata;
}

export interface ApiTokenRecord {
  hash: string;
  metadata: ApiTokenMetadata;
}

export interface IssueTokenOptions {
  label: string;
  ownerId?: string;
  environment?: ApiTokenEnvironment;
  scopes: readonly Scope[];
  ttlSeconds?: number;
}

export interface TokenVerificationResult {
  valid: boolean;
  metadata?: ApiTokenMetadata;
  error?: string;
}

const DEFAULT_TTL_SECONDS = 365 * 24 * 3600; // 1 year
const MAX_TOKENS_PER_STORE = 1000;

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function isValidTokenFormat(rawToken: string): boolean {
  if (typeof rawToken !== "string") return false;
  return /^cx_(live|test)_[a-f0-9]{64}$/.test(rawToken);
}

export function parseTokenEnvironment(rawToken: string): ApiTokenEnvironment | null {
  if (rawToken.startsWith("cx_live_")) return "live";
  if (rawToken.startsWith("cx_test_")) return "test";
  return null;
}

export function maskToken(rawToken: string): string {
  if (!isValidTokenFormat(rawToken)) return "cx_invalid";
  const prefix = rawToken.slice(0, 8); // "cx_live_" or "cx_test_"
  const tail = rawToken.slice(-4);
  return `${prefix}...${tail}`;
}

export function generateRawToken(environment: ApiTokenEnvironment = "live"): string {
  const prefix = environment === "live" ? "cx_live_" : "cx_test_";
  const entropyHex = randomBytes(32).toString("hex"); // 64 hex chars
  return `${prefix}${entropyHex}`;
}

export class ApiTokenStore {
  private static instance: ApiTokenStore | null = null;
  private tokensByHash: Map<string, ApiTokenRecord> = new Map();
  private tokensById: Map<string, string> = new Map(); // id -> hash

  public static getInstance(): ApiTokenStore {
    if (!ApiTokenStore.instance) {
      ApiTokenStore.instance = new ApiTokenStore();
    }
    return ApiTokenStore.instance;
  }

  public static resetInstance(): void {
    ApiTokenStore.instance = null;
  }

  public issueToken(options: IssueTokenOptions): IssuedApiToken {
    if (!options.label || typeof options.label !== "string" || options.label.trim().length === 0) {
      throw new Error("Token label is required");
    }

    if (this.tokensByHash.size >= MAX_TOKENS_PER_STORE) {
      throw new Error("ApiTokenStore capacity limit reached");
    }

    const env: ApiTokenEnvironment = options.environment ?? "live";
    const rawToken = generateRawToken(env);
    const hash = hashToken(rawToken);
    const id = randomUUID();
    const nowIso = new Date().toISOString();

    const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    const expiresAtIso = ttlSeconds !== undefined ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : undefined;

    // Filter valid scopes against permitted catalog
    const validScopes: Scope[] = Array.from(
      new Set(options.scopes.filter((s) => (SERVICE_PERMISSIONS["admin-dashboard"] as readonly string[]).includes(s)))
    );

    const metadata: ApiTokenMetadata = {
      id,
      label: options.label.trim(),
      ownerId: options.ownerId ?? "admin-dashboard",
      environment: env,
      prefix: env === "live" ? "cx_live_" : "cx_test_",
      maskedToken: maskToken(rawToken),
      scopes: validScopes,
      createdAtIso: nowIso,
      expiresAtIso,
      revoked: false,
    };

    const record: ApiTokenRecord = { hash, metadata };
    this.tokensByHash.set(hash, record);
    this.tokensById.set(id, hash);

    logger.info("Issued CONXIAN_API_TOKEN", { id, environment: env, label: metadata.label });

    return { rawToken, metadata };
  }

  public verifyToken(rawToken: string, requiredScope?: Scope): TokenVerificationResult {
    if (!isValidTokenFormat(rawToken)) {
      return { valid: false, error: "Invalid token format" };
    }

    const candidateHash = hashToken(rawToken);
    const candidateBuffer = Buffer.from(candidateHash, "hex");

    let matchedRecord: ApiTokenRecord | null = null;

    // Constant-time search over token hashes
    for (const record of this.tokensByHash.values()) {
      const recordBuffer = Buffer.from(record.hash, "hex");
      if (candidateBuffer.length === recordBuffer.length && timingSafeEqual(candidateBuffer, recordBuffer)) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      return { valid: false, error: "Token not found" };
    }

    const { metadata } = matchedRecord;

    if (metadata.revoked) {
      return { valid: false, error: "Token is revoked" };
    }

    if (metadata.expiresAtIso && new Date(metadata.expiresAtIso).getTime() <= Date.now()) {
      return { valid: false, error: "Token has expired" };
    }

    if (requiredScope && !metadata.scopes.includes(requiredScope)) {
      return { valid: false, error: `Missing required scope: ${requiredScope}` };
    }

    // Touch lastUsedAtIso timestamp
    metadata.lastUsedAtIso = new Date().toISOString();

    return { valid: true, metadata };
  }

  public revokeToken(id: string): boolean {
    const hash = this.tokensById.get(id);
    if (!hash) return false;

    const record = this.tokensByHash.get(hash);
    if (!record) return false;

    record.metadata.revoked = true;
    record.metadata.revokedAtIso = new Date().toISOString();

    logger.info("Revoked CONXIAN_API_TOKEN", { id, label: record.metadata.label });
    return true;
  }

  public listMetadata(ownerId?: string): ApiTokenMetadata[] {
    const results: ApiTokenMetadata[] = [];
    for (const record of this.tokensByHash.values()) {
      if (!ownerId || record.metadata.ownerId === ownerId) {
        results.push({ ...record.metadata, scopes: [...record.metadata.scopes] });
      }
    }
    return results.sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime());
  }
}

export function getApiTokenStore(): ApiTokenStore {
  return ApiTokenStore.getInstance();
}
