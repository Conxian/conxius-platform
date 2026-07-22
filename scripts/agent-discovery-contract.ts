import { createHash } from 'node:crypto';

export const DISCOVERY_ATTESTATION_PROTOCOL = 'conxian-agent-discovery.attestation' as const;
export const DISCOVERY_ATTESTATION_VERSION = '1.0.0' as const;
export const DISCOVERY_TRUST_ANCHOR_PROTOCOL = 'conxian-agent-discovery.trust-anchor' as const;
export const DISCOVERY_TRUST_ANCHOR_VERSION = '1.0.0' as const;

export type DiscoveryDigest = `sha256:${string}`;
export type DiscoveryContextTier = 'GOVERNANCE' | 'CANONICAL' | 'ARCHITECTURAL' | 'OPERATIONAL' | 'EVIDENCE' | 'HISTORICAL';

export interface DiscoveryTrustContextEntry {
  path: string;
  tier: DiscoveryContextTier;
  required: boolean;
  priority: number;
  description: string;
  content_digest: DiscoveryDigest;
}

export interface DiscoveryTrustSkillEntry {
  id: string;
  path: string;
  metadata_digest: DiscoveryDigest;
  content_digest: DiscoveryDigest;
}

export interface DiscoveryTrustScope {
  repository: { root: '.' };
  manifest: {
    path: '.agents/manifest.json';
    version: string;
    content_digest: DiscoveryDigest;
  };
  registry: {
    path: '.agents/skills/registry.json';
    version: string;
    content_digest: DiscoveryDigest;
  };
  context: {
    required: DiscoveryTrustContextEntry[];
    optional: DiscoveryTrustContextEntry[];
  };
  skills: {
    selected: DiscoveryTrustSkillEntry[];
  };
}

/** Content-addressed output of a locally validated #1162 discovery pass. */
export interface DiscoveryAttestation extends DiscoveryTrustScope {
  protocol: typeof DISCOVERY_ATTESTATION_PROTOCOL;
  version: typeof DISCOVERY_ATTESTATION_VERSION;
  digest: DiscoveryDigest;
}

/**
* Content-addressed trust input supplied by an adapter/deployment boundary.
* The digest binds content but does not authenticate who supplied or selected it.
*/
export interface DiscoveryTrustAnchor extends DiscoveryTrustScope {
  protocol: typeof DISCOVERY_TRUST_ANCHOR_PROTOCOL;
  version: typeof DISCOVERY_TRUST_ANCHOR_VERSION;
  digest: DiscoveryDigest;
}

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalize(value: unknown, path: string): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} must contain finite numbers`);
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((entry, index) => canonicalize(entry, `${path}[${index}]`)).join(',')}]`;
  if (isPlainRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key], `${path}.${key}`)}`).join(',')}}`;
  }
  throw new TypeError(`${path} must be JSON-compatible data`);
}

/** Canonical JSON used by the #1162 discovery attestation and trust-anchor contract. */
export function discoveryCanonicalJson(value: unknown): string {
  return canonicalize(value, 'value');
}

/** Domain-separated SHA-256 for #1162 discovery content and trust contracts. */
export function discoveryDigestFor(domain: string, value: unknown): DiscoveryDigest {
  if (domain.length === 0) throw new TypeError('domain must not be empty');
  return `sha256:${createHash('sha256').update(`${domain}\u0000${discoveryCanonicalJson(value)}`, 'utf8').digest('hex')}`;
}

export function discoveryAttestationScope(attestation: DiscoveryAttestation): DiscoveryTrustScope {
  const { protocol: _protocol, version: _version, digest: _digest, ...scope } = attestation;
  return scope;
}

export function discoveryTrustAnchorScope(anchor: DiscoveryTrustAnchor): DiscoveryTrustScope {
  const { protocol: _protocol, version: _version, digest: _digest, ...scope } = anchor;
  return scope;
}

export type DiscoveryContractJsonValue = JsonValue;
