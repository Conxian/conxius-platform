"use client";

import React, { useState, useEffect } from 'react';

type GatewayStats = {
  status: string;
  version: string;
  processedHeight: number;
  uptimeSeconds: number;
};

type NexusState = {
  merkleRoot: string;
  syncStatus: string;
  leafCount: number;
};

type ErpTreasuryAsset = {
  ticker: string;
  balance: string;
};

type ErpEmployee = {
  name: string;
  ubi_id: string;
};

type ErpDashboardData = {
  treasury: ErpTreasuryAsset[];
  employees: ErpEmployee[];
};

type TelemetryService = {
  name: string;
  status: string;
  health: string;
};

async function fetchJsonWithFallback(baseUrl: string, paths: string[]): Promise<Record<string, any> | null> {
  for (const p of paths) {
    try {
      const r = await fetch(`${baseUrl}${p}`, { cache: 'no-store' });
      if (r.ok) return await r.json();
    } catch (e) {
      // continue
    }
  }
  return null;
}

function getString(obj: Record<string, unknown>, key: string): string {
  return typeof obj?.[key] === 'string' ? obj[key] : "";
}

function getNumber(obj: Record<string, unknown>, key: string): number {
  return typeof obj?.[key] === 'number' ? obj[key] : 0;
}

function getBoolean(obj: Record<string, unknown>, key: string): boolean | null {
  return typeof obj?.[key] === 'boolean' ? obj[key] : null;
}

function normalizeNexusState(nexus: Record<string, any>, status: Record<string, any>): NexusState {
  return {
    merkleRoot: getString(nexus, "merkle_root") || getString(status, "state_root") || getString(status, "mmr_root") || "N/A",
    syncStatus: getString(nexus, "sync_status") || (getNumber(status, "drift") === 0 ? "synced" : "syncing"),
    leafCount: getNumber(nexus, "leaf_count") || getNumber(status, "processed_height"),
  };
}

function BlueprintCard() {
  const [show, setShow] = useState(false);
  const [blueprint, setBlueprint] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlueprint = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/deployment/blueprint");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBlueprint(data);
      setShow(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ marginTop: '3rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: '#2E403B' }}>Deployment Blueprint</h3>
            <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.8rem' }}>Deterministic infrastructure metadata for AI agents.</p>
          </div>
          <button
            onClick={() => show ? setShow(false) : fetchBlueprint()}
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fcfcfc' }}
          >
            {loading ? "Exporting..." : show ? "Hide Blueprint" : "Export Blueprint"}
          </button>
          {error && <span style={{ color: '#b91c1c', fontSize: '0.8rem' }}>{error}</span>}
        </div>
        {show && blueprint && (
          <pre style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '0.8rem', overflowX: 'auto', border: '1px solid #eee' }}>
            {JSON.stringify(blueprint, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<GatewayStats | null>(null);
  const [nexus, setNexus] = useState<NexusState | null>(null);
  const [erpData, setErpData] = useState<ErpDashboardData | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryService[]>([]);
  const [rewardsData, setRewardsData] = useState<Record<string, any> | null>(null);
  const [frontendsData, setFrontendsData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const rawBaseUrl = process.env.NEXT_PUBLIC_CORE_API_URL;

      // Fetch Infrastructure Stats
      if (rawBaseUrl) {
        const baseUrl = rawBaseUrl.replace(/\/$/, "");
        const statusJson = await fetchJsonWithFallback(baseUrl, ["/api/v1/status", "/v1/status"]);
        if (statusJson) {
          const safetyMode = getBoolean(statusJson, "safety_mode");
          setStats({
            status: safetyMode === null ? "Unknown" : safetyMode ? "Degraded" : "Healthy",
            version: getString(statusJson, "version"),
            processedHeight: getNumber(statusJson, "processed_height"),
            uptimeSeconds: getNumber(statusJson, "uptime_seconds"),
          });
          const nexusJson = await fetchJsonWithFallback(baseUrl, ["/api/v1/nexus/state"]);
          setNexus(normalizeNexusState(nexusJson, statusJson));
        }
      }

      // Fetch ERP Data
      const erpRes = await fetch("/api/erp");
      if (erpRes.ok) {
        const erpJson = await erpRes.json();
        setErpData(erpJson);
      }

      // Fetch Service Telemetry
      const telRes = await fetch("/api/v1/ui/telemetry");
      if (telRes.ok) {
        const telJson = await telRes.json();
        setTelemetry(telJson.services);
      }

      // Fetch Reward Allocation
      try {
        const rewardsRes = await fetch("/api/v1/rewards/sources");
        if (rewardsRes.ok) {
          const rewardsJson = await rewardsRes.json();
          setRewardsData(rewardsJson);
        }
      } catch {
        setRewardsData(null);
      }

      // Fetch Frontend Registry
      try {
        const frontendsRes = await fetch("/api/v1/frontends");
        if (frontendsRes.ok) {
          const frontendsJson = await frontendsRes.json();
          setFrontendsData(frontendsJson);
        }
      } catch {
        setFrontendsData(null);
      }

    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Unexpected error while fetching status pulse.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fef3c7", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem", color: "#92400e", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontWeight: "bold" }}>INTERNAL USE ONLY:</span> This dashboard provides high-privilege access to platform infrastructure and telemetry.
      </div>
      {error && (
        <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fee2e2", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem", color: "#b91c1c", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#2E403B' }}>Infrastructure Pulse</h2>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>Real-time telemetry from the Unified Gateway Engine.</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          style={{
            padding: '0.6rem 1.2rem',
            cursor: loading ? 'default' : 'pointer',
            backgroundColor: loading ? '#ccc' : '#2E403B',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? "Refreshing..." : "Trigger Pulse"}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
        <StatCard title="Gateway Health" value={stats?.status ?? "Unknown"} color="#2E403B" />
        <StatCard title="Engine Version" value={stats?.version ?? "N/A"} />
        <StatCard title="Requests Handled" value={stats?.processedHeight ?? 0} />
        <StatCard title="Uptime" value={stats?.uptimeSeconds ? `${Math.floor(stats.uptimeSeconds / 60)}m ${stats.uptimeSeconds % 60}s` : "0s"} />
      </div>

      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        <section>
          <h3 style={{ borderBottom: '2px solid #D4A017', paddingBottom: '0.5rem', color: '#2E403B' }}>Nexus Node Indexing State</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <DataRow label="State Root (Merkle)" value={nexus?.merkleRoot ?? "Initializing..."} mono />
            </div>
            <DataRow label="Sync Status" value={nexus?.syncStatus ?? "Pending"} highlight={nexus?.syncStatus === 'synced'} />
            <DataRow label="Indexed Blocks" value={nexus?.leafCount ?? 0} />
          </div>
        </section>

        <section>
          <h3 style={{ borderBottom: '2px solid #D4A017', paddingBottom: '0.5rem', color: '#2E403B' }}>Sovereign Services</h3>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginTop: '1rem' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {telemetry.length > 0 ? telemetry.map(svc => (
                <ServiceItem key={svc.name} name={svc.name} status={svc.status} health={svc.health} />
              )) : (
                <>
                  <ServiceItem name="Stacks (L2)" status="Unknown" health="unknown" />
                  <ServiceItem name="Bisq (P2P)" status="Unknown" health="unknown" />
                  <ServiceItem name="RGB (Client-side)" status="Unknown" health="unknown" />
                  <ServiceItem name="BitVM (Optimistic)" status="Unknown" health="unknown" />
                  <ServiceItem name="Lightning Network" status="Unknown" health="unknown" />
                </>
              )}
            </ul>
          </div>
        </section>
      </div>

      {rewardsData && (
        <section style={{ marginTop: "3rem" }}>
          <h3 style={{ borderBottom: "2px solid #D4A017", paddingBottom: "0.5rem", color: "#2E403B", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span>Protocol Reward Allocation</span>
            <a href="/rewards" style={{ fontSize: "0.75rem", color: "#D4A017", textDecoration: "none" }}>View breakdown →</a>
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginTop: "1rem" }}>
            {rewardsData.allocation.map((a: Record<string, any>) => (
              <div key={a.category} style={{
                backgroundColor: "white",
                padding: "1rem",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "0.7rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  {a.category}
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2E403B" }}>
                  {a.percentage}%
                </div>
                <div style={{ fontSize: "0.7rem", color: "#999", marginTop: "0.25rem" }}>
                  {(a.amount_sats / 100_000_000).toFixed(2)} BTC
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", borderRadius: "6px", overflow: "hidden", height: "8px" }}>
            {rewardsData.allocation.map((a: Record<string, any>) => (
              <div key={a.category} style={{
                flex: a.amount_sats,
                backgroundColor: a.category === "Community Rewards" ? "#059669" : a.category === "Governance Rewards" ? "#7C3AED" : a.category === "Operational Rewards" ? "#2563EB" : "#D4A017",
              }} />
            ))}
          </div>
          <p style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.5rem" }}>
            Total period revenue: {(rewardsData.total_revenue_sats / 100_000_000).toFixed(2)} BTC ({rewardsData.period}) &middot; SFO: {rewardsData.sfo_address}
          </p>
        </section>
      )}

      {frontendsData && (
        <section style={{ marginTop: "3rem" }}>
          <h3 style={{ borderBottom: "2px solid #D4A017", paddingBottom: "0.5rem", color: "#2E403B", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span>Frontend Surfaces</span>
            <a href="/frontends" style={{ fontSize: "0.75rem", color: "#D4A017", textDecoration: "none" }}>View registry →</a>
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginTop: "1rem" }}>
            <div style={{ backgroundColor: "white", padding: "1rem", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", textAlign: "center" }}>
              <div style={{ fontSize: "0.7rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Total</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2E403B" }}>{frontendsData.summary.total}</div>
            </div>
            <div style={{ backgroundColor: "white", padding: "1rem", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", textAlign: "center", borderLeft: "3px solid #059669" }}>
              <div style={{ fontSize: "0.7rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>🏛 Canonical</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#059669" }}>{frontendsData.summary.canonical}</div>
            </div>
            <div style={{ backgroundColor: "white", padding: "1rem", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", textAlign: "center", borderLeft: "3px solid #D4A017" }}>
              <div style={{ fontSize: "0.7rem", color: "#666", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>🏘 Community</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#D4A017" }}>{frontendsData.summary.communityHosted}</div>
            </div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.5rem" }}>
            {frontendsData.frontends.filter((f: Record<string, any>) => f.status === "pending-governance-review").length} pending governance review
          </p>
        </section>
      )}

      <section style={{ marginTop: "3rem" }}>
        <h3 style={{ borderBottom: "2px solid #D4A017", paddingBottom: "0.5rem", color: "#2E403B" }}>Sovereign ERP Operations</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "2rem", marginTop: "1rem" }}>
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <h4 style={{ color: "#666", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "1rem" }}>Treasury (Asset Reserves)</h4>
            {erpData?.treasury.map(t => (
              <div key={t.ticker} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span>{t.ticker}</span>
                <span style={{ fontWeight: "bold" }}>{t.balance}</span>
              </div>
            ))}
          </div>
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <h4 style={{ color: "#666", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "1rem" }}>Active Payroll (UBI-Linked)</h4>
            {erpData?.employees.map(e => (
              <div key={e.ubi_id} style={{ marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "0.9rem" }}>{e.name}</div>
                <div style={{ fontSize: "0.7rem", color: "#888" }}>{e.ubi_id}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <BlueprintCard />
    </div>
  );
}

function StatCard({ title, value, color }: { title: string, value: string | number, color?: string }) {
  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      borderLeft: color ? `4px solid ${color}` : 'none'
    }}>
      <h4 style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h4>
      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: color || '#333' }}>{value}</div>
    </div>
  );
}

function DataRow({ label, value, mono, highlight }: { label: string, value: string | number, mono?: boolean, highlight?: boolean }) {
  return (
    <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{
        fontSize: mono ? '0.85rem' : '1.1rem',
        fontWeight: 'bold',
        fontFamily: mono ? 'monospace' : 'inherit',
        color: highlight ? '#2E403B' : '#333',
        wordBreak: 'break-all'
      }}>
        {value}
      </div>
    </div>
  );
}

function ServiceItem({ name, status, health }: { name: string, status: string, health?: string }) {
  const statusColor = health === "active" || health === "healthy" ? "#2E403B" : "#666";
  return (
    <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F0F0F0' }}>
      <span style={{ fontWeight: 500 }}>{name}</span>
      <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '0.9rem' }}>{status}</span>
    </li>
  );
}
