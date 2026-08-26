import "server-only";

export type ConnectionState = "configured" | "not-configured" | "external-evidence";

export type ConnectionEvidence = {
  name: string;
  owner: string;
  contract: string;
  environment: readonly string[];
  state: ConnectionState;
  boundary: string;
  nextAction: string;
};

const connections = [
  {
    name: "Gateway",
    owner: "conxian-gateway",
    contract: "HTTP routing and provider adapters",
    environment: ["GATEWAY_URL", "ADMIN_DASHBOARD_API_KEY"],
    boundary: "Platform routes requests and records evidence; Gateway owns provider execution.",
    nextAction: "Verify the Gateway health and status contract in the deployed environment.",
  },
  {
    name: "Nexus",
    owner: "conxian-nexus",
    contract: "Observation, synchronization, and proof state",
    environment: ["NEXUS_ADMIN_API_TOKEN"],
    boundary: "Nexus owns observation and finality; the platform consumes status only.",
    nextAction: "Verify an authenticated Nexus state response and freshness timestamp.",
  },
  {
    name: "Neon",
    owner: "Neon/Postgres",
    contract: "Relational persistence and migrations",
    environment: ["NEON_DATABASE_URL", "DATABASE_URL"],
    boundary: "Use only for platform-owned operational metadata; never custody or funds.",
    nextAction: "Confirm schema, migration ownership, backups, and least-privilege role.",
  },
  {
    name: "Supabase",
    owner: "Supabase",
    contract: "Project API, Auth, Storage, and RLS",
    environment: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
    boundary: "Use only where a Supabase-owned contract and RLS policy are verified.",
    nextAction: "Run MCP schema and RLS verification before enabling data-backed pages.",
  },
  {
    name: "Upstash",
    owner: "Upstash Redis",
    contract: "Ephemeral cache, rate limiting, or queue state",
    environment: ["UPSTASH_KV_KV_REST_API_URL", "UPSTASH_KV_KV_REST_API_TOKEN"],
    boundary: "Not a system of record; do not use for balances, custody, or authoritative state.",
    nextAction: "Confirm intended keyspace, TTL policy, and rate-limit ownership.",
  },
  {
    name: "AWS Aurora PostgreSQL",
    owner: "AWS platform",
    contract: "PostgreSQL-compatible operational persistence",
    environment: ["AWS_APG_AWS_RESOURCE_ARN", "AWS_APG_PGHOST"],
    boundary: "Alternative persistence provider; never enable alongside Neon without ownership.",
    nextAction: "Select one authoritative SQL store and document failover ownership.",
  },
  {
    name: "Stacks / Oracle / Tableland / Kwil",
    owner: "External protocol providers",
    contract: "Protocol and data-plane adapters",
    environment: ["STACKS_NODE_RPC_URL", "ORACLE_ENDPOINT_URL", "TABLELAND_BASE_URL", "KWIL_PROVIDER_URL"],
    boundary: "External execution remains provider-owned and unavailable without endpoint evidence.",
    nextAction: "Provide endpoint-specific health, auth, and version evidence before exposing actions.",
  },
] as const;

export function getConnectionEvidence(): ConnectionEvidence[] {
  return connections.map((connection) => {
    const configured = connection.environment.some((key) => Boolean(process.env[key]));
    return {
      ...connection,
      state: configured ? "configured" : "not-configured",
      nextAction: configured ? connection.nextAction : `Configure ${connection.environment.join(" or ")} and verify the contract.`,
    };
  });
}
